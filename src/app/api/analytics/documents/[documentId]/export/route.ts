import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/db";
import DocumentModel from "@/models/Document";
import DocumentEvent from "@/models/DocumentEvent";
import { getDateRange } from "@/lib/analytics/helpers";
import { formatDuration } from "@/lib/analytics/helpers";
import type { Period } from "@/lib/analytics/constants";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const { documentId } = await params;

    const doc = await DocumentModel.findOne({
      _id: documentId,
      organizationId: session.user.organizationId,
    }).lean();

    if (!doc) {
      return NextResponse.json({ error: "Document niet gevonden" }, { status: 404 });
    }

    const format = req.nextUrl.searchParams.get("format") || "csv";
    const period = (req.nextUrl.searchParams.get("period") || "30d") as Period;
    const { start, end } = getDateRange(period);

    if (format === "csv") {
      // Daily aggregation for CSV
      const dailyData = await DocumentEvent.aggregate([
        {
          $match: {
            documentId: doc._id,
            timestamp: { $gte: start, $lte: end },
          },
        },
        {
          $group: {
            _id: {
              date: {
                $dateToString: { format: "%Y-%m-%d", date: "$timestamp" },
              },
              eventType: "$eventType",
            },
            count: { $sum: 1 },
            uniqueSessions: { $addToSet: "$sessionId" },
            avgActiveSeconds: {
              $avg: {
                $cond: [
                  { $eq: ["$eventType", "time_on_page"] },
                  "$metadata.activeSeconds",
                  null,
                ],
              },
            },
          },
        },
        { $sort: { "_id.date": 1 } },
      ]);

      // Build CSV rows per date
      const dateMap = new Map<
        string,
        {
          views: number;
          uniqueVisitors: number;
          downloads: number;
          chatMessages: number;
          avgReadTime: number;
          termClicks: number;
        }
      >();

      for (const row of dailyData) {
        const date = row._id.date;
        if (!dateMap.has(date)) {
          dateMap.set(date, {
            views: 0,
            uniqueVisitors: 0,
            downloads: 0,
            chatMessages: 0,
            avgReadTime: 0,
            termClicks: 0,
          });
        }
        const entry = dateMap.get(date)!;
        switch (row._id.eventType) {
          case "page_view":
            entry.views = row.count;
            entry.uniqueVisitors = row.uniqueSessions.length;
            break;
          case "pdf_download":
            entry.downloads = row.count;
            break;
          case "chat_message":
            entry.chatMessages = row.count;
            break;
          case "time_on_page":
            entry.avgReadTime = Math.round(row.avgActiveSeconds || 0);
            break;
          case "term_click":
            entry.termClicks = row.count;
            break;
        }
      }

      const csvHeader =
        "Datum,Views,Unieke Bezoekers,Downloads,Chat Berichten,Gem. Leestijd,Term Kliks\n";
      const csvRows = Array.from(dateMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(
          ([date, stats]) =>
            `${date},${stats.views},${stats.uniqueVisitors},${stats.downloads},${stats.chatMessages},${formatDuration(stats.avgReadTime)},${stats.termClicks}`
        )
        .join("\n");

      const csv = csvHeader + csvRows;

      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="analytics-${doc.shortId}-${period}.csv"`,
        },
      });
    }

    return NextResponse.json(
      { error: "Unsupported format. Use ?format=csv" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Export analytics error:", error);
    return NextResponse.json(
      { error: "Failed to export analytics" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/db";
import DocumentModel from "@/models/Document";
import DocumentEvent from "@/models/DocumentEvent";
import { getDateRange, getPreviousPeriodRange, calculateTrend } from "@/lib/analytics/helpers";
import type { Period } from "@/lib/analytics/constants";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const orgId = session.user.organizationId;
    const period = (req.nextUrl.searchParams.get("period") || "30d") as Period;
    const { start, end } = getDateRange(period);
    const prev = getPreviousPeriodRange(start, end);

    // Get all documents for this organization
    const documents = await DocumentModel.find(
      { organizationId: orgId, status: "ready" },
      { _id: 1, title: 1, shortId: 1, analytics: 1, createdAt: 1 }
    ).lean();

    const docIds = documents.map((d) => d._id);

    // Current period aggregation
    const [currentStats] = await DocumentEvent.aggregate([
      {
        $match: {
          documentId: { $in: docIds },
          timestamp: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: null,
          totalViews: {
            $sum: { $cond: [{ $eq: ["$eventType", "page_view"] }, 1, 0] },
          },
          uniqueSessions: { $addToSet: "$sessionId" },
          totalDownloads: {
            $sum: { $cond: [{ $eq: ["$eventType", "pdf_download"] }, 1, 0] },
          },
          totalChatMessages: {
            $sum: { $cond: [{ $eq: ["$eventType", "chat_message"] }, 1, 0] },
          },
          readTimeSamples: {
            $push: {
              $cond: [
                { $eq: ["$eventType", "time_on_page"] },
                "$metadata.activeSeconds",
                "$$REMOVE",
              ],
            },
          },
        },
      },
      {
        $project: {
          totalViews: 1,
          uniqueVisitors: { $size: "$uniqueSessions" },
          totalDownloads: 1,
          totalChatMessages: 1,
          avgReadTime: { $avg: "$readTimeSamples" },
        },
      },
    ]);

    // Previous period for trends
    const [prevStats] = await DocumentEvent.aggregate([
      {
        $match: {
          documentId: { $in: docIds },
          timestamp: { $gte: prev.start, $lte: prev.end },
        },
      },
      {
        $group: {
          _id: null,
          totalViews: {
            $sum: { $cond: [{ $eq: ["$eventType", "page_view"] }, 1, 0] },
          },
          uniqueSessions: { $addToSet: "$sessionId" },
          totalDownloads: {
            $sum: { $cond: [{ $eq: ["$eventType", "pdf_download"] }, 1, 0] },
          },
          totalChatMessages: {
            $sum: { $cond: [{ $eq: ["$eventType", "chat_message"] }, 1, 0] },
          },
          readTimeSamples: {
            $push: {
              $cond: [
                { $eq: ["$eventType", "time_on_page"] },
                "$metadata.activeSeconds",
                "$$REMOVE",
              ],
            },
          },
        },
      },
      {
        $project: {
          totalViews: 1,
          uniqueVisitors: { $size: "$uniqueSessions" },
          totalDownloads: 1,
          totalChatMessages: 1,
          avgReadTime: { $avg: "$readTimeSamples" },
        },
      },
    ]);

    const cur = currentStats || {
      totalViews: 0,
      uniqueVisitors: 0,
      totalDownloads: 0,
      totalChatMessages: 0,
      avgReadTime: 0,
    };
    const prv = prevStats || {
      totalViews: 0,
      uniqueVisitors: 0,
      totalDownloads: 0,
      totalChatMessages: 0,
      avgReadTime: 0,
    };

    // Timeseries data (views per day)
    const timeseries = await DocumentEvent.aggregate([
      {
        $match: {
          documentId: { $in: docIds },
          eventType: "page_view",
          timestamp: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$timestamp" },
          },
          views: { $sum: 1 },
          uniqueSessions: { $addToSet: "$sessionId" },
        },
      },
      {
        $project: {
          date: "$_id",
          views: 1,
          uniqueVisitors: { $size: "$uniqueSessions" },
        },
      },
      { $sort: { date: 1 } },
    ]);

    // Top documents by views in period
    const topDocuments = await DocumentEvent.aggregate([
      {
        $match: {
          documentId: { $in: docIds },
          eventType: "page_view",
          timestamp: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: "$documentId",
          views: { $sum: 1 },
          uniqueSessions: { $addToSet: "$sessionId" },
        },
      },
      { $sort: { views: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: "documents",
          localField: "_id",
          foreignField: "_id",
          as: "doc",
        },
      },
      { $unwind: "$doc" },
      {
        $project: {
          documentId: "$_id",
          title: "$doc.title",
          shortId: "$doc.shortId",
          views: 1,
          uniqueVisitors: { $size: "$uniqueSessions" },
        },
      },
    ]);

    // Device breakdown
    const devices = await DocumentEvent.aggregate([
      {
        $match: {
          documentId: { $in: docIds },
          eventType: "page_view",
          timestamp: { $gte: start, $lte: end },
          "metadata.device": { $exists: true },
        },
      },
      {
        $group: {
          _id: "$metadata.device",
          count: { $sum: 1 },
        },
      },
    ]);

    const deviceBreakdown = { desktop: 0, mobile: 0, tablet: 0 };
    for (const d of devices) {
      if (d._id in deviceBreakdown) {
        deviceBreakdown[d._id as keyof typeof deviceBreakdown] = d.count;
      }
    }

    // Per-document stats for table
    const documentStats = await DocumentEvent.aggregate([
      {
        $match: {
          documentId: { $in: docIds },
          timestamp: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: {
            documentId: "$documentId",
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
    ]);

    // Build per-doc summary
    const docStatsMap = new Map<
      string,
      {
        views: number;
        uniqueVisitors: number;
        downloads: number;
        chatMessages: number;
        avgReadTime: number;
      }
    >();

    for (const stat of documentStats) {
      const docId = stat._id.documentId.toString();
      if (!docStatsMap.has(docId)) {
        docStatsMap.set(docId, {
          views: 0,
          uniqueVisitors: 0,
          downloads: 0,
          chatMessages: 0,
          avgReadTime: 0,
        });
      }
      const entry = docStatsMap.get(docId)!;
      switch (stat._id.eventType) {
        case "page_view":
          entry.views = stat.count;
          entry.uniqueVisitors = stat.uniqueSessions.length;
          break;
        case "pdf_download":
          entry.downloads = stat.count;
          break;
        case "chat_message":
          entry.chatMessages = stat.count;
          break;
        case "time_on_page":
          entry.avgReadTime = Math.round(stat.avgActiveSeconds || 0);
          break;
      }
    }

    const documentsWithStats = documents.map((d) => {
      const stats = docStatsMap.get(d._id.toString());
      return {
        _id: d._id,
        title: d.title,
        shortId: d.shortId,
        createdAt: d.createdAt,
        views: stats?.views || 0,
        uniqueVisitors: stats?.uniqueVisitors || 0,
        downloads: stats?.downloads || 0,
        chatMessages: stats?.chatMessages || 0,
        avgReadTime: stats?.avgReadTime || 0,
      };
    });

    return NextResponse.json({
      overview: {
        totalViews: cur.totalViews,
        viewsTrend: calculateTrend(cur.totalViews, prv.totalViews),
        uniqueVisitors: cur.uniqueVisitors,
        visitorsTrend: calculateTrend(cur.uniqueVisitors, prv.uniqueVisitors),
        avgReadTime: Math.round(cur.avgReadTime || 0),
        readTimeTrend: calculateTrend(
          cur.avgReadTime || 0,
          prv.avgReadTime || 0
        ),
        totalChatMessages: cur.totalChatMessages,
        chatTrend: calculateTrend(
          cur.totalChatMessages,
          prv.totalChatMessages
        ),
        totalDownloads: cur.totalDownloads,
        downloadsTrend: calculateTrend(
          cur.totalDownloads,
          prv.totalDownloads
        ),
      },
      timeseries,
      topDocuments,
      deviceBreakdown,
      documents: documentsWithStats,
    });
  } catch (error) {
    console.error("Analytics overview error:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}

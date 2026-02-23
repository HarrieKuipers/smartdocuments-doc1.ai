import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/db";
import DocumentModel from "@/models/Document";
import DocumentEvent from "@/models/DocumentEvent";
import { getDateRange } from "@/lib/analytics/helpers";
import type { Period } from "@/lib/analytics/constants";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const docIds = req.nextUrl.searchParams.get("documents")?.split(",") || [];
    const period = (req.nextUrl.searchParams.get("period") || "30d") as Period;

    if (docIds.length < 2 || docIds.length > 5) {
      return NextResponse.json(
        { error: "Selecteer 2 tot 5 documenten om te vergelijken" },
        { status: 400 }
      );
    }

    const { start, end } = getDateRange(period);

    // Verify all documents belong to user's org
    const docs = await DocumentModel.find({
      _id: { $in: docIds },
      organizationId: session.user.organizationId,
    })
      .select("_id title shortId")
      .lean();

    if (docs.length !== docIds.length) {
      return NextResponse.json(
        { error: "Niet alle documenten gevonden" },
        { status: 404 }
      );
    }

    // Fetch stats for each document in parallel
    const comparisons = await Promise.all(
      docs.map(async (doc) => {
        const [stats] = await DocumentEvent.aggregate([
          {
            $match: {
              documentId: doc._id,
              timestamp: { $gte: start, $lte: end },
            },
          },
          {
            $group: {
              _id: null,
              totalViews: {
                $sum: {
                  $cond: [{ $eq: ["$eventType", "page_view"] }, 1, 0],
                },
              },
              uniqueSessions: {
                $addToSet: {
                  $cond: [
                    { $eq: ["$eventType", "page_view"] },
                    "$sessionId",
                    "$$REMOVE",
                  ],
                },
              },
              totalDownloads: {
                $sum: {
                  $cond: [{ $eq: ["$eventType", "pdf_download"] }, 1, 0],
                },
              },
              totalChatMessages: {
                $sum: {
                  $cond: [{ $eq: ["$eventType", "chat_message"] }, 1, 0],
                },
              },
              totalTermClicks: {
                $sum: {
                  $cond: [{ $eq: ["$eventType", "term_click"] }, 1, 0],
                },
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
              scrollDepthSamples: {
                $push: {
                  $cond: [
                    { $eq: ["$eventType", "scroll_depth"] },
                    "$metadata.scrollPercentage",
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
              totalTermClicks: 1,
              avgReadTime: { $avg: "$readTimeSamples" },
              avgScrollDepth: { $avg: "$scrollDepthSamples" },
              completionRate: {
                $multiply: [
                  {
                    $divide: [
                      {
                        $size: {
                          $filter: {
                            input: "$scrollDepthSamples",
                            as: "s",
                            cond: { $gte: ["$$s", 100] },
                          },
                        },
                      },
                      { $max: [{ $size: "$scrollDepthSamples" }, 1] },
                    ],
                  },
                  100,
                ],
              },
            },
          },
        ]);

        // Timeseries for this document
        const timeseries = await DocumentEvent.aggregate([
          {
            $match: {
              documentId: doc._id,
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
            },
          },
          { $project: { date: "$_id", views: 1 } },
          { $sort: { date: 1 } },
        ]);

        return {
          document: { _id: doc._id, title: doc.title, shortId: doc.shortId },
          stats: stats || {
            totalViews: 0,
            uniqueVisitors: 0,
            totalDownloads: 0,
            totalChatMessages: 0,
            totalTermClicks: 0,
            avgReadTime: 0,
            avgScrollDepth: 0,
            completionRate: 0,
          },
          timeseries,
        };
      })
    );

    return NextResponse.json({ comparisons });
  } catch (error) {
    console.error("Compare analytics error:", error);
    return NextResponse.json(
      { error: "Failed to compare documents" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/db";
import DocumentModel from "@/models/Document";
import DocumentEvent from "@/models/DocumentEvent";
import { getDateRange, getPreviousPeriodRange, calculateTrend } from "@/lib/analytics/helpers";
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

    // Verify document belongs to user's org
    const doc = await DocumentModel.findOne({
      _id: documentId,
      organizationId: session.user.organizationId,
    }).lean();

    if (!doc) {
      return NextResponse.json({ error: "Document niet gevonden" }, { status: 404 });
    }

    const period = (req.nextUrl.searchParams.get("period") || "30d") as Period;
    const startDate = req.nextUrl.searchParams.get("startDate") || undefined;
    const endDate = req.nextUrl.searchParams.get("endDate") || undefined;
    const { start, end } = getDateRange(period, startDate, endDate);
    const prev = getPreviousPeriodRange(start, end);

    // Current period stats
    const [currentStats] = await DocumentEvent.aggregate([
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
            $sum: { $cond: [{ $eq: ["$eventType", "page_view"] }, 1, 0] },
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
            $sum: { $cond: [{ $eq: ["$eventType", "pdf_download"] }, 1, 0] },
          },
          totalShares: {
            $sum: {
              $cond: [{ $eq: ["$eventType", "share_link_created"] }, 1, 0],
            },
          },
          totalChatMessages: {
            $sum: { $cond: [{ $eq: ["$eventType", "chat_message"] }, 1, 0] },
          },
          totalTermClicks: {
            $sum: { $cond: [{ $eq: ["$eventType", "term_click"] }, 1, 0] },
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
          bounceSessions: {
            $addToSet: "$sessionId",
          },
        },
      },
      {
        $project: {
          totalViews: 1,
          uniqueVisitors: { $size: "$uniqueSessions" },
          totalDownloads: 1,
          totalShares: 1,
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

    // Previous period for trends
    const [prevStats] = await DocumentEvent.aggregate([
      {
        $match: {
          documentId: doc._id,
          timestamp: { $gte: prev.start, $lte: prev.end },
        },
      },
      {
        $group: {
          _id: null,
          totalViews: {
            $sum: { $cond: [{ $eq: ["$eventType", "page_view"] }, 1, 0] },
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
          totalChatMessages: 1,
          avgReadTime: { $avg: "$readTimeSamples" },
        },
      },
    ]);

    const cur = currentStats || {
      totalViews: 0,
      uniqueVisitors: 0,
      totalDownloads: 0,
      totalShares: 0,
      totalChatMessages: 0,
      totalTermClicks: 0,
      avgReadTime: 0,
      avgScrollDepth: 0,
      completionRate: 0,
    };
    const prv = prevStats || {
      totalViews: 0,
      uniqueVisitors: 0,
      totalChatMessages: 0,
      avgReadTime: 0,
    };

    // Timeseries
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

    // Device breakdown
    const devices = await DocumentEvent.aggregate([
      {
        $match: {
          documentId: doc._id,
          eventType: "page_view",
          timestamp: { $gte: start, $lte: end },
          "metadata.device": { $exists: true },
        },
      },
      { $group: { _id: "$metadata.device", count: { $sum: 1 } } },
    ]);

    const deviceBreakdown = { desktop: 0, mobile: 0, tablet: 0 };
    for (const d of devices) {
      if (d._id in deviceBreakdown) {
        deviceBreakdown[d._id as keyof typeof deviceBreakdown] = d.count;
      }
    }

    // Top referrers
    const topReferrers = await DocumentEvent.aggregate([
      {
        $match: {
          documentId: doc._id,
          eventType: "page_view",
          timestamp: { $gte: start, $lte: end },
          "metadata.referrer": { $exists: true },
        },
      },
      { $group: { _id: "$metadata.referrer", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
      { $project: { referrer: "$_id", count: 1 } },
    ]);

    // Top countries
    const topCountries = await DocumentEvent.aggregate([
      {
        $match: {
          documentId: doc._id,
          eventType: "page_view",
          timestamp: { $gte: start, $lte: end },
          "metadata.country": { $exists: true, $ne: null },
        },
      },
      { $group: { _id: "$metadata.country", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
      { $project: { country: "$_id", count: 1 } },
    ]);

    return NextResponse.json({
      document: {
        _id: doc._id,
        title: doc.title,
        shortId: doc.shortId,
        createdAt: doc.createdAt,
      },
      overview: {
        totalViews: cur.totalViews,
        viewsTrend: calculateTrend(cur.totalViews, prv.totalViews),
        uniqueVisitors: cur.uniqueVisitors,
        visitorsTrend: calculateTrend(cur.uniqueVisitors, prv.uniqueVisitors),
        avgReadTime: Math.round(cur.avgReadTime || 0),
        readTimeTrend: calculateTrend(cur.avgReadTime || 0, prv.avgReadTime || 0),
        totalDownloads: cur.totalDownloads,
        totalShares: cur.totalShares,
        totalChatMessages: cur.totalChatMessages,
        chatTrend: calculateTrend(cur.totalChatMessages, prv.totalChatMessages),
        totalTermClicks: cur.totalTermClicks,
        avgScrollDepth: Math.round(cur.avgScrollDepth || 0),
        completionRate: Math.round(cur.completionRate || 0),
      },
      timeseries,
      deviceBreakdown,
      topReferrers,
      topCountries,
    });
  } catch (error) {
    console.error("Document analytics error:", error);
    return NextResponse.json(
      { error: "Failed to fetch document analytics" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import DocumentModel from "@/models/Document";
import DocumentEvent from "@/models/DocumentEvent";
import DocumentAnalyticsSummary from "@/models/DocumentAnalyticsSummary";
import { startOfDay, subDays, endOfDay } from "date-fns";
import { checkAlerts } from "@/lib/analytics/checkAlerts";

export async function GET(req: NextRequest) {
  // Verify cron secret
  const secret = req.nextUrl.searchParams.get("secret");
  if (secret !== process.env.ANALYTICS_CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectDB();

    const yesterday = subDays(new Date(), 1);
    const dayStart = startOfDay(yesterday);
    const dayEnd = endOfDay(yesterday);

    // Get all ready documents
    const documents = await DocumentModel.find(
      { status: "ready" },
      { _id: 1 }
    ).lean();

    let aggregated = 0;

    for (const doc of documents) {
      const docId = doc._id;

      // Check if already aggregated
      const existing = await DocumentAnalyticsSummary.findOne({
        documentId: docId,
        date: dayStart,
      });
      if (existing) continue;

      // Page views
      const viewStats = await DocumentEvent.aggregate([
        {
          $match: {
            documentId: docId,
            eventType: "page_view",
            timestamp: { $gte: dayStart, $lte: dayEnd },
          },
        },
        {
          $group: {
            _id: null,
            views: { $sum: 1 },
            uniqueSessions: { $addToSet: "$sessionId" },
          },
        },
      ]);

      const views = viewStats[0]?.views || 0;
      const uniqueVisitors = viewStats[0]?.uniqueSessions?.length || 0;

      if (views === 0) continue; // Skip if no views

      // Downloads, prints, shares
      const actionStats = await DocumentEvent.aggregate([
        {
          $match: {
            documentId: docId,
            eventType: { $in: ["pdf_download", "print", "share_link_created"] },
            timestamp: { $gte: dayStart, $lte: dayEnd },
          },
        },
        {
          $group: {
            _id: "$eventType",
            count: { $sum: 1 },
          },
        },
      ]);
      const actions: Record<string, number> = {};
      for (const a of actionStats) {
        actions[a._id] = a.count;
      }

      // Read time stats
      const readTimeStats = await DocumentEvent.aggregate([
        {
          $match: {
            documentId: docId,
            eventType: "time_on_page",
            timestamp: { $gte: dayStart, $lte: dayEnd },
          },
        },
        {
          $sort: { timestamp: -1 },
        },
        {
          $group: {
            _id: "$sessionId",
            maxActiveSeconds: { $max: "$metadata.activeSeconds" },
          },
        },
      ]);

      const readTimes = readTimeStats
        .map((r) => r.maxActiveSeconds || 0)
        .filter((t) => t > 0);
      const avgReadTime =
        readTimes.length > 0
          ? readTimes.reduce((a, b) => a + b, 0) / readTimes.length
          : 0;
      const sortedReadTimes = [...readTimes].sort((a, b) => a - b);
      const medianReadTime =
        sortedReadTimes.length > 0
          ? sortedReadTimes[Math.floor(sortedReadTimes.length / 2)]
          : 0;

      // Bounce rate (sessions < 10 seconds)
      const bounceSessions = readTimes.filter((t) => t < 10).length;
      const bounceRate =
        readTimes.length > 0
          ? Math.round((bounceSessions / readTimes.length) * 100)
          : 0;

      // Scroll depth
      const scrollStats = await DocumentEvent.aggregate([
        {
          $match: {
            documentId: docId,
            eventType: "scroll_depth",
            timestamp: { $gte: dayStart, $lte: dayEnd },
          },
        },
        {
          $group: {
            _id: "$sessionId",
            maxScroll: { $max: "$metadata.scrollPercentage" },
          },
        },
      ]);
      const scrollDepths = scrollStats.map((s) => s.maxScroll || 0);
      const avgScrollDepth =
        scrollDepths.length > 0
          ? Math.round(
              scrollDepths.reduce((a, b) => a + b, 0) / scrollDepths.length
            )
          : 0;
      const completionRate =
        scrollDepths.length > 0
          ? Math.round(
              (scrollDepths.filter((s) => s >= 100).length /
                scrollDepths.length) *
                100
            )
          : 0;

      // Chat stats
      const chatStats = await DocumentEvent.aggregate([
        {
          $match: {
            documentId: docId,
            eventType: { $in: ["chat_message", "chat_feedback"] },
            timestamp: { $gte: dayStart, $lte: dayEnd },
          },
        },
        {
          $group: {
            _id: "$eventType",
            count: { $sum: 1 },
            sessions: { $addToSet: "$sessionId" },
            positive: {
              $sum: {
                $cond: [
                  { $eq: ["$metadata.feedbackType", "positive"] },
                  1,
                  0,
                ],
              },
            },
            negative: {
              $sum: {
                $cond: [
                  { $eq: ["$metadata.feedbackType", "negative"] },
                  1,
                  0,
                ],
              },
            },
          },
        },
      ]);

      const chatMessageStats = chatStats.find(
        (c) => c._id === "chat_message"
      );
      const chatFeedbackStats = chatStats.find(
        (c) => c._id === "chat_feedback"
      );

      // Term clicks
      const termStats = await DocumentEvent.aggregate([
        {
          $match: {
            documentId: docId,
            eventType: "term_click",
            timestamp: { $gte: dayStart, $lte: dayEnd },
          },
        },
        {
          $group: {
            _id: "$metadata.term",
            clicks: { $sum: 1 },
          },
        },
        { $sort: { clicks: -1 } },
        { $limit: 20 },
      ]);

      // Device breakdown
      const deviceStats = await DocumentEvent.aggregate([
        {
          $match: {
            documentId: docId,
            eventType: "page_view",
            timestamp: { $gte: dayStart, $lte: dayEnd },
            "metadata.device": { $exists: true },
          },
        },
        { $group: { _id: "$metadata.device", count: { $sum: 1 } } },
      ]);
      const deviceBreakdown = { desktop: 0, tablet: 0, mobile: 0 };
      for (const d of deviceStats) {
        if (d._id in deviceBreakdown) {
          deviceBreakdown[d._id as keyof typeof deviceBreakdown] = d.count;
        }
      }

      // Referrers
      const refStats = await DocumentEvent.aggregate([
        {
          $match: {
            documentId: docId,
            eventType: "page_view",
            timestamp: { $gte: dayStart, $lte: dayEnd },
            "metadata.referrer": { $exists: true },
          },
        },
        { $group: { _id: "$metadata.referrer", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]);

      // Countries
      const countryStats = await DocumentEvent.aggregate([
        {
          $match: {
            documentId: docId,
            eventType: "page_view",
            timestamp: { $gte: dayStart, $lte: dayEnd },
            "metadata.country": { $exists: true, $ne: null },
          },
        },
        { $group: { _id: "$metadata.country", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]);

      // Save summary
      await DocumentAnalyticsSummary.create({
        documentId: docId,
        date: dayStart,
        views,
        uniqueVisitors,
        downloads: actions["pdf_download"] || 0,
        prints: actions["print"] || 0,
        shares: actions["share_link_created"] || 0,
        avgReadTimeSeconds: Math.round(avgReadTime),
        medianReadTimeSeconds: Math.round(medianReadTime),
        bounceRate,
        avgScrollDepth,
        completionRate,
        chatSessions: chatMessageStats?.sessions?.length || 0,
        chatMessages: chatMessageStats?.count || 0,
        chatPositiveFeedback: chatFeedbackStats?.positive || 0,
        chatNegativeFeedback: chatFeedbackStats?.negative || 0,
        avgResponseTime: 0,
        termClicks: termStats.reduce((sum, t) => sum + t.clicks, 0),
        topTerms: termStats.map((t) => ({ term: t._id, clicks: t.clicks })),
        deviceBreakdown,
        topReferrers: refStats.map((r) => ({
          referrer: r._id,
          count: r.count,
        })),
        topCountries: countryStats.map((c) => ({
          country: c._id,
          count: c.count,
        })),
      });

      aggregated++;
    }

    // Run alert checks after aggregation
    try {
      await checkAlerts();
    } catch (alertErr) {
      console.error("Alert check error:", alertErr);
    }

    return NextResponse.json({
      success: true,
      aggregated,
      date: dayStart.toISOString(),
    });
  } catch (error) {
    console.error("Analytics aggregation error:", error);
    return NextResponse.json(
      { error: "Aggregation failed" },
      { status: 500 }
    );
  }
}

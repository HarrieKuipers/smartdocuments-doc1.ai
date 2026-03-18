import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/db";
import Collection from "@/models/Collection";
import CollectionEvent from "@/models/CollectionEvent";
import {
  getDateRange,
  getPreviousPeriodRange,
  calculateTrend,
} from "@/lib/analytics/helpers";
import { format } from "date-fns";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ collectionId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Niet geautoriseerd." },
        { status: 401 }
      );
    }

    await connectDB();
    const { collectionId } = await params;

    const collection = await Collection.findOne({
      _id: collectionId,
      organizationId: session.user.organizationId,
    }).lean();

    if (!collection) {
      return NextResponse.json(
        { error: "Collectie niet gevonden." },
        { status: 404 }
      );
    }

    const period = req.nextUrl.searchParams.get("period") || "30d";
    const startDate = req.nextUrl.searchParams.get("startDate") || undefined;
    const endDate = req.nextUrl.searchParams.get("endDate") || undefined;

    const { start, end } = getDateRange(period, startDate, endDate);
    const prev = getPreviousPeriodRange(start, end);

    const baseMatch = {
      collectionId: collection._id,
      timestamp: { $gte: start, $lte: end },
    };
    const prevMatch = {
      collectionId: collection._id,
      timestamp: { $gte: prev.start, $lte: prev.end },
    };

    // Current period stats
    const [currentStats] = await CollectionEvent.aggregate([
      { $match: baseMatch },
      {
        $group: {
          _id: null,
          totalEvents: { $sum: 1 },
          pageViews: {
            $sum: { $cond: [{ $eq: ["$eventType", "page_view"] }, 1, 0] },
          },
          uniqueSessions: { $addToSet: "$sessionId" },
          documentClicks: {
            $sum: { $cond: [{ $eq: ["$eventType", "document_click"] }, 1, 0] },
          },
          searches: {
            $sum: { $cond: [{ $eq: ["$eventType", "search_query"] }, 1, 0] },
          },
          chatMessages: {
            $sum: { $cond: [{ $eq: ["$eventType", "chat_message"] }, 1, 0] },
          },
          chatSuggestionClicks: {
            $sum: {
              $cond: [{ $eq: ["$eventType", "chat_suggestion_click"] }, 1, 0],
            },
          },
        },
      },
    ]);

    // Previous period stats for trends
    const [prevStats] = await CollectionEvent.aggregate([
      { $match: prevMatch },
      {
        $group: {
          _id: null,
          pageViews: {
            $sum: { $cond: [{ $eq: ["$eventType", "page_view"] }, 1, 0] },
          },
          uniqueSessions: { $addToSet: "$sessionId" },
          documentClicks: {
            $sum: { $cond: [{ $eq: ["$eventType", "document_click"] }, 1, 0] },
          },
          chatMessages: {
            $sum: { $cond: [{ $eq: ["$eventType", "chat_message"] }, 1, 0] },
          },
        },
      },
    ]);

    const cur = {
      pageViews: currentStats?.pageViews || 0,
      uniqueVisitors: currentStats?.uniqueSessions?.length || 0,
      documentClicks: currentStats?.documentClicks || 0,
      searches: currentStats?.searches || 0,
      chatMessages: currentStats?.chatMessages || 0,
      chatSuggestionClicks: currentStats?.chatSuggestionClicks || 0,
    };

    const pre = {
      pageViews: prevStats?.pageViews || 0,
      uniqueVisitors: prevStats?.uniqueSessions?.length || 0,
      documentClicks: prevStats?.documentClicks || 0,
      chatMessages: prevStats?.chatMessages || 0,
    };

    // Timeseries (views per day)
    const timeseries = await CollectionEvent.aggregate([
      { $match: { ...baseMatch, eventType: "page_view" } },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$timestamp" },
          },
          views: { $sum: 1 },
          visitors: { $addToSet: "$sessionId" },
        },
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          date: "$_id",
          views: 1,
          visitors: { $size: "$visitors" },
        },
      },
    ]);

    // Top clicked documents
    const topDocuments = await CollectionEvent.aggregate([
      { $match: { ...baseMatch, eventType: "document_click" } },
      {
        $group: {
          _id: "$metadata.documentTitle",
          shortId: { $first: "$metadata.documentShortId" },
          clicks: { $sum: 1 },
        },
      },
      { $sort: { clicks: -1 } },
      { $limit: 10 },
      {
        $project: {
          title: "$_id",
          shortId: 1,
          clicks: 1,
        },
      },
    ]);

    // Top search queries
    const topSearches = await CollectionEvent.aggregate([
      { $match: { ...baseMatch, eventType: "search_query" } },
      {
        $group: {
          _id: "$metadata.searchQuery",
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 10 },
      { $project: { query: "$_id", count: 1 } },
    ]);

    // Device breakdown
    const devices = await CollectionEvent.aggregate([
      { $match: { ...baseMatch, eventType: "page_view" } },
      {
        $group: {
          _id: "$metadata.device",
          count: { $sum: 1 },
        },
      },
    ]);

    const deviceBreakdown = {
      desktop: 0,
      mobile: 0,
      tablet: 0,
    };
    for (const d of devices) {
      if (d._id in deviceBreakdown) {
        deviceBreakdown[d._id as keyof typeof deviceBreakdown] = d.count;
      }
    }

    // Top referrers
    const topReferrers = await CollectionEvent.aggregate([
      {
        $match: {
          ...baseMatch,
          eventType: "page_view",
          "metadata.referrer": { $exists: true, $ne: "" },
        },
      },
      {
        $group: {
          _id: "$metadata.referrer",
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 10 },
      { $project: { referrer: "$_id", count: 1 } },
    ]);

    return NextResponse.json({
      data: {
        collection: {
          name: collection.name,
          slug: collection.slug,
        },
        period: { start: format(start, "yyyy-MM-dd"), end: format(end, "yyyy-MM-dd") },
        stats: {
          pageViews: cur.pageViews,
          pageViewsTrend: calculateTrend(cur.pageViews, pre.pageViews),
          uniqueVisitors: cur.uniqueVisitors,
          uniqueVisitorsTrend: calculateTrend(cur.uniqueVisitors, pre.uniqueVisitors),
          documentClicks: cur.documentClicks,
          documentClicksTrend: calculateTrend(cur.documentClicks, pre.documentClicks),
          searches: cur.searches,
          chatMessages: cur.chatMessages,
          chatMessagesTrend: calculateTrend(cur.chatMessages, pre.chatMessages),
          chatSuggestionClicks: cur.chatSuggestionClicks,
        },
        timeseries,
        topDocuments,
        topSearches,
        topReferrers,
        deviceBreakdown,
      },
    });
  } catch (error) {
    console.error("Collection analytics error:", error);
    return NextResponse.json(
      { error: "Kon analytics niet ophalen." },
      { status: 500 }
    );
  }
}

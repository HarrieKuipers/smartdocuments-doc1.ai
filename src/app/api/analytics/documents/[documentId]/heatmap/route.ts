import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/db";
import DocumentModel from "@/models/Document";
import DocumentEvent from "@/models/DocumentEvent";
import { getDateRange } from "@/lib/analytics/helpers";
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

    const period = (req.nextUrl.searchParams.get("period") || "30d") as Period;
    const { start, end } = getDateRange(period);

    // Scroll depth distribution
    const scrollData = await DocumentEvent.aggregate([
      {
        $match: {
          documentId: doc._id,
          eventType: "scroll_depth",
          timestamp: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: "$metadata.scrollPercentage",
          count: { $sum: 1 },
          uniqueSessions: { $addToSet: "$sessionId" },
        },
      },
      {
        $project: {
          percentage: "$_id",
          count: 1,
          uniqueVisitors: { $size: "$uniqueSessions" },
        },
      },
      { $sort: { percentage: 1 } },
    ]);

    // Section view heatmap
    const sectionViews = await DocumentEvent.aggregate([
      {
        $match: {
          documentId: doc._id,
          eventType: "section_view",
          timestamp: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: "$metadata.sectionId",
          title: { $first: "$metadata.sectionTitle" },
          views: { $sum: 1 },
          uniqueSessions: { $addToSet: "$sessionId" },
        },
      },
      {
        $project: {
          sectionId: "$_id",
          title: 1,
          views: 1,
          uniqueVisitors: { $size: "$uniqueSessions" },
        },
      },
      { $sort: { views: -1 } },
    ]);

    // Total sessions for percentage calculation
    const totalSessions = await DocumentEvent.distinct("sessionId", {
      documentId: doc._id,
      eventType: "page_view",
      timestamp: { $gte: start, $lte: end },
    });

    return NextResponse.json({
      scrollDepth: scrollData,
      sectionViews,
      totalSessions: totalSessions.length,
    });
  } catch (error) {
    console.error("Heatmap analytics error:", error);
    return NextResponse.json(
      { error: "Failed to fetch heatmap data" },
      { status: 500 }
    );
  }
}

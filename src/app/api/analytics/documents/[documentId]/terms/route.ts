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

    const doc = await DocumentModel.findOne({
      _id: documentId,
      organizationId: session.user.organizationId,
    }).lean();

    if (!doc) {
      return NextResponse.json({ error: "Document niet gevonden" }, { status: 404 });
    }

    const period = (req.nextUrl.searchParams.get("period") || "30d") as Period;
    const { start, end } = getDateRange(period);
    const prev = getPreviousPeriodRange(start, end);

    // Current period term clicks
    const terms = await DocumentEvent.aggregate([
      {
        $match: {
          documentId: doc._id,
          eventType: "term_click",
          timestamp: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: "$metadata.term",
          clicks: { $sum: 1 },
        },
      },
      { $sort: { clicks: -1 } },
      { $limit: 50 },
    ]);

    // Previous period for trends
    const prevTerms = await DocumentEvent.aggregate([
      {
        $match: {
          documentId: doc._id,
          eventType: "term_click",
          timestamp: { $gte: prev.start, $lte: prev.end },
        },
      },
      {
        $group: {
          _id: "$metadata.term",
          clicks: { $sum: 1 },
        },
      },
    ]);

    const prevMap = new Map(prevTerms.map((t) => [t._id, t.clicks]));

    const termsWithTrend = terms.map((t) => ({
      term: t._id,
      clicks: t.clicks,
      trend: calculateTrend(t.clicks, prevMap.get(t._id) || 0),
    }));

    return NextResponse.json({ terms: termsWithTrend });
  } catch (error) {
    console.error("Terms analytics error:", error);
    return NextResponse.json(
      { error: "Failed to fetch term analytics" },
      { status: 500 }
    );
  }
}

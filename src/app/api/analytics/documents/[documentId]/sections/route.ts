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

    const sections = await DocumentEvent.aggregate([
      {
        $match: {
          documentId: doc._id,
          eventType: "section_view",
          timestamp: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: {
            sectionId: "$metadata.sectionId",
            sectionTitle: "$metadata.sectionTitle",
          },
          views: { $sum: 1 },
          uniqueSessions: { $addToSet: "$sessionId" },
        },
      },
      {
        $project: {
          sectionId: "$_id.sectionId",
          sectionTitle: "$_id.sectionTitle",
          views: 1,
          uniqueVisitors: { $size: "$uniqueSessions" },
        },
      },
      { $sort: { views: -1 } },
    ]);

    return NextResponse.json({ sections });
  } catch (error) {
    console.error("Sections analytics error:", error);
    return NextResponse.json(
      { error: "Failed to fetch section analytics" },
      { status: 500 }
    );
  }
}

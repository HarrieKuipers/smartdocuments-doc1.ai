import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/db";
import DocumentModel from "@/models/Document";
import SectionFeedback from "@/models/SectionFeedback";

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
      return NextResponse.json(
        { error: "Document niet gevonden" },
        { status: 404 }
      );
    }

    const feedbackTypeFilter = req.nextUrl.searchParams.get("feedbackType") || undefined;
    const page = parseInt(req.nextUrl.searchParams.get("page") || "1");
    const limit = parseInt(req.nextUrl.searchParams.get("limit") || "50");

    // Aggregated feedback per section
    const sections = await SectionFeedback.aggregate([
      { $match: { documentId: doc._id } },
      {
        $group: {
          _id: {
            sectionType: "$sectionType",
            sectionIndex: "$sectionIndex",
            sectionTitle: "$sectionTitle",
          },
          total: { $sum: 1 },
          unclear: {
            $sum: { $cond: [{ $eq: ["$feedbackType", "unclear"] }, 1, 0] },
          },
          helpful: {
            $sum: { $cond: [{ $eq: ["$feedbackType", "helpful"] }, 1, 0] },
          },
          incorrect: {
            $sum: { $cond: [{ $eq: ["$feedbackType", "incorrect"] }, 1, 0] },
          },
          tooComplex: {
            $sum: { $cond: [{ $eq: ["$feedbackType", "too-complex"] }, 1, 0] },
          },
          tooSimple: {
            $sum: { $cond: [{ $eq: ["$feedbackType", "too-simple"] }, 1, 0] },
          },
          comments: {
            $push: {
              $cond: [
                { $and: [{ $ne: ["$comment", null] }, { $ne: ["$comment", ""] }] },
                {
                  comment: "$comment",
                  feedbackType: "$feedbackType",
                  createdAt: "$createdAt",
                },
                "$$REMOVE",
              ],
            },
          },
        },
      },
      {
        $project: {
          sectionType: "$_id.sectionType",
          sectionIndex: "$_id.sectionIndex",
          sectionTitle: "$_id.sectionTitle",
          total: 1,
          counts: {
            unclear: "$unclear",
            helpful: "$helpful",
            incorrect: "$incorrect",
            "too-complex": "$tooComplex",
            "too-simple": "$tooSimple",
          },
          comments: 1,
        },
      },
      { $sort: { total: -1 } },
    ]);

    // Get total feedback count
    const totalResult = await SectionFeedback.countDocuments({
      documentId: doc._id,
    });

    // Get comments with optional filter, paginated
    const commentFilter: Record<string, unknown> = {
      documentId: doc._id,
      comment: { $exists: true, $ne: "" },
    };
    if (feedbackTypeFilter) {
      commentFilter.feedbackType = feedbackTypeFilter;
    }

    const [comments, totalComments] = await Promise.all([
      SectionFeedback.find(commentFilter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .select("sectionType sectionIndex sectionTitle feedbackType comment createdAt")
        .lean(),
      SectionFeedback.countDocuments(commentFilter),
    ]);

    return NextResponse.json({
      sections,
      total: totalResult,
      comments,
      totalComments,
      page,
      totalPages: Math.ceil(totalComments / limit),
    });
  } catch (error) {
    console.error("Feedback analytics error:", error);
    return NextResponse.json(
      { error: "Kon feedback niet ophalen." },
      { status: 500 }
    );
  }
}

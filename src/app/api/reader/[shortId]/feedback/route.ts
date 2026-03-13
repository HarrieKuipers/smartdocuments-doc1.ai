import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/db";
import DocumentModel from "@/models/Document";
import SectionFeedback, {
  SECTION_TYPES,
  FEEDBACK_TYPES,
} from "@/models/SectionFeedback";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ shortId: string }> }
) {
  try {
    await connectDB();
    const { shortId } = await params;

    const doc = await DocumentModel.findOne({
      $or: [{ shortId }, { customSlug: shortId }],
    }).lean();

    if (!doc) {
      return NextResponse.json(
        { error: "Document niet gevonden." },
        { status: 404 }
      );
    }

    if (doc.status !== "ready") {
      return NextResponse.json(
        { error: "Document is nog niet gepubliceerd." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { sectionType, sectionIndex, sectionTitle, feedbackType, comment, sessionId } = body;

    // Validate required fields
    if (!sectionType || !feedbackType || !sessionId) {
      return NextResponse.json(
        { error: "sectionType, feedbackType en sessionId zijn verplicht." },
        { status: 400 }
      );
    }

    if (!SECTION_TYPES.includes(sectionType)) {
      return NextResponse.json(
        { error: "Ongeldig sectionType." },
        { status: 400 }
      );
    }

    if (!FEEDBACK_TYPES.includes(feedbackType)) {
      return NextResponse.json(
        { error: "Ongeldig feedbackType." },
        { status: 400 }
      );
    }

    // Rate limit: max 20 feedbacks per sessionId per document per day
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const feedbackCount = await SectionFeedback.countDocuments({
      documentId: doc._id,
      sessionId,
      createdAt: { $gte: dayAgo },
    });

    if (feedbackCount >= 20) {
      return NextResponse.json(
        { error: "Feedbacklimiet bereikt. Probeer het morgen opnieuw." },
        { status: 429 }
      );
    }

    const feedback = await SectionFeedback.create({
      documentId: doc._id,
      sectionType,
      sectionIndex: sectionIndex ?? undefined,
      sectionTitle: sectionTitle ?? undefined,
      feedbackType,
      comment: comment ? String(comment).slice(0, 1000) : undefined,
      sessionId,
    });

    return NextResponse.json({ success: true, id: feedback._id }, { status: 201 });
  } catch (error) {
    console.error("Section feedback POST error:", error);
    return NextResponse.json(
      { error: "Kon feedback niet opslaan." },
      { status: 500 }
    );
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ shortId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const { shortId } = await params;

    const doc = await DocumentModel.findOne({
      $or: [{ shortId }, { customSlug: shortId }],
      organizationId: session.user.organizationId,
    }).lean();

    if (!doc) {
      return NextResponse.json(
        { error: "Document niet gevonden." },
        { status: 404 }
      );
    }

    // Aggregated feedback counts per section
    const summary = await SectionFeedback.aggregate([
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
        },
      },
      { $sort: { sectionType: 1, sectionIndex: 1 } },
    ]);

    return NextResponse.json({ sections: summary });
  } catch (error) {
    console.error("Section feedback GET error:", error);
    return NextResponse.json(
      { error: "Kon feedback niet ophalen." },
      { status: 500 }
    );
  }
}

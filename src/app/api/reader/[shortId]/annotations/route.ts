import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import DocumentModel from "@/models/Document";
import Annotation from "@/models/Annotation";

// GET: Public annotations for a document
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ shortId: string }> }
) {
  try {
    await connectDB();
    const { shortId } = await params;

    const doc = await DocumentModel.findOne({
      $or: [{ shortId }, { customSlug: shortId }],
      status: "ready",
    })
      .select("_id")
      .lean();

    if (!doc) {
      return NextResponse.json({ error: "Document niet gevonden." }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const sectionType = searchParams.get("sectionType");
    const sectionIndex = searchParams.get("sectionIndex");

    const filter: Record<string, unknown> = {
      documentId: doc._id,
      authorType: "public",
    };
    if (sectionType) filter.sectionType = sectionType;
    if (sectionIndex !== null && sectionIndex !== undefined) {
      filter.sectionIndex = parseInt(sectionIndex);
    }

    const annotations = await Annotation.find(filter)
      .sort({ createdAt: 1 })
      .select("sectionType sectionIndex authorName content parentId resolved createdAt")
      .lean();

    // Also return counts per section for badges
    const counts = await Annotation.aggregate([
      { $match: { documentId: doc._id, authorType: "public", parentId: { $exists: false } } },
      {
        $group: {
          _id: { sectionType: "$sectionType", sectionIndex: "$sectionIndex" },
          count: { $sum: 1 },
        },
      },
    ]);

    return NextResponse.json({ data: { annotations, counts } });
  } catch (error) {
    console.error("Public annotations error:", error);
    return NextResponse.json({ error: "Kon annotaties niet ophalen." }, { status: 500 });
  }
}

// POST: Create a public annotation
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ shortId: string }> }
) {
  try {
    await connectDB();
    const { shortId } = await params;

    const doc = await DocumentModel.findOne({
      $or: [{ shortId }, { customSlug: shortId }],
      status: "ready",
    })
      .select("_id")
      .lean();

    if (!doc) {
      return NextResponse.json({ error: "Document niet gevonden." }, { status: 404 });
    }

    const body = await req.json();
    const { sectionType, sectionIndex, content, authorName, parentId, sessionId } = body;

    if (!sectionType || !content?.trim()) {
      return NextResponse.json(
        { error: "sectionType en content zijn verplicht." },
        { status: 400 }
      );
    }

    if (content.trim().length > 2000) {
      return NextResponse.json(
        { error: "Annotatie mag maximaal 2000 tekens bevatten." },
        { status: 400 }
      );
    }

    const annotation = await Annotation.create({
      documentId: doc._id,
      sectionType,
      sectionIndex,
      authorName: authorName?.trim() || "Anoniem",
      authorType: "public",
      sessionId,
      content: content.trim(),
      parentId: parentId || undefined,
    });

    return NextResponse.json({ data: annotation }, { status: 201 });
  } catch (error) {
    console.error("Public annotation create error:", error);
    return NextResponse.json({ error: "Kon annotatie niet aanmaken." }, { status: 500 });
  }
}

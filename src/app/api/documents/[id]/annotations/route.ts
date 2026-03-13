import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/db";
import DocumentModel from "@/models/Document";
import Annotation from "@/models/Annotation";

// GET: List annotations for a document (team view - includes both team & public)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Niet geautoriseerd." }, { status: 401 });
    }

    await connectDB();
    const { id } = await params;

    const doc = await DocumentModel.findOne({
      _id: id,
      organizationId: session.user.organizationId,
    })
      .select("_id")
      .lean();

    if (!doc) {
      return NextResponse.json({ error: "Document niet gevonden." }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const sectionType = searchParams.get("sectionType");
    const sectionIndex = searchParams.get("sectionIndex");

    const filter: Record<string, unknown> = { documentId: id };
    if (sectionType) filter.sectionType = sectionType;
    if (sectionIndex !== null && sectionIndex !== undefined) {
      filter.sectionIndex = parseInt(sectionIndex);
    }

    const annotations = await Annotation.find(filter)
      .sort({ createdAt: 1 })
      .populate("userId", "name email image")
      .populate("resolvedBy", "name")
      .lean();

    return NextResponse.json({ data: annotations });
  } catch (error) {
    console.error("Annotations list error:", error);
    return NextResponse.json({ error: "Kon annotaties niet ophalen." }, { status: 500 });
  }
}

// POST: Create a team annotation
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Niet geautoriseerd." }, { status: 401 });
    }

    await connectDB();
    const { id } = await params;

    const doc = await DocumentModel.findOne({
      _id: id,
      organizationId: session.user.organizationId,
    })
      .select("_id")
      .lean();

    if (!doc) {
      return NextResponse.json({ error: "Document niet gevonden." }, { status: 404 });
    }

    const body = await req.json();
    const { sectionType, sectionIndex, content, parentId } = body;

    if (!sectionType || !content?.trim()) {
      return NextResponse.json(
        { error: "sectionType en content zijn verplicht." },
        { status: 400 }
      );
    }

    const annotation = await Annotation.create({
      documentId: id,
      sectionType,
      sectionIndex,
      userId: session.user.id,
      authorName: session.user.name || "Teamlid",
      authorType: "team",
      content: content.trim(),
      parentId: parentId || undefined,
    });

    return NextResponse.json({ data: annotation }, { status: 201 });
  } catch (error) {
    console.error("Annotation create error:", error);
    return NextResponse.json({ error: "Kon annotatie niet aanmaken." }, { status: 500 });
  }
}

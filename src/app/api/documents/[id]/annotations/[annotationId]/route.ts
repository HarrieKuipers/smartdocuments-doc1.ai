import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/db";
import DocumentModel from "@/models/Document";
import Annotation from "@/models/Annotation";

// PUT: Edit or resolve/unresolve annotation
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; annotationId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Niet geautoriseerd." }, { status: 401 });
    }

    await connectDB();
    const { id, annotationId } = await params;

    const doc = await DocumentModel.findOne({
      _id: id,
      organizationId: session.user.organizationId,
    })
      .select("_id")
      .lean();

    if (!doc) {
      return NextResponse.json({ error: "Document niet gevonden." }, { status: 404 });
    }

    const annotation = await Annotation.findOne({
      _id: annotationId,
      documentId: id,
    });

    if (!annotation) {
      return NextResponse.json({ error: "Annotatie niet gevonden." }, { status: 404 });
    }

    const body = await req.json();

    // Resolve/unresolve (any team member can do this)
    if (body.resolved !== undefined) {
      annotation.resolved = body.resolved;
      if (body.resolved) {
        annotation.resolvedBy = session.user.id as unknown as typeof annotation.resolvedBy;
        annotation.resolvedAt = new Date();
      } else {
        annotation.resolvedBy = undefined;
        annotation.resolvedAt = undefined;
      }
    }

    // Edit content (only original author)
    if (body.content !== undefined) {
      if (annotation.userId?.toString() !== session.user.id) {
        return NextResponse.json(
          { error: "Alleen de auteur kan de inhoud bewerken." },
          { status: 403 }
        );
      }
      annotation.content = body.content.trim();
    }

    await annotation.save();
    return NextResponse.json({ data: annotation });
  } catch (error) {
    console.error("Annotation update error:", error);
    return NextResponse.json({ error: "Kon annotatie niet bijwerken." }, { status: 500 });
  }
}

// DELETE: Delete annotation (author or org admin)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; annotationId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Niet geautoriseerd." }, { status: 401 });
    }

    await connectDB();
    const { id, annotationId } = await params;

    const doc = await DocumentModel.findOne({
      _id: id,
      organizationId: session.user.organizationId,
    })
      .select("_id")
      .lean();

    if (!doc) {
      return NextResponse.json({ error: "Document niet gevonden." }, { status: 404 });
    }

    const annotation = await Annotation.findOne({
      _id: annotationId,
      documentId: id,
    });

    if (!annotation) {
      return NextResponse.json({ error: "Annotatie niet gevonden." }, { status: 404 });
    }

    // Only author or admin/owner can delete
    const isAuthor = annotation.userId?.toString() === session.user.id;
    const isAdmin = ["owner", "admin"].includes(session.user.role || "");
    if (!isAuthor && !isAdmin) {
      return NextResponse.json(
        { error: "Geen toestemming om deze annotatie te verwijderen." },
        { status: 403 }
      );
    }

    // Delete annotation and its replies
    await Annotation.deleteMany({
      $or: [{ _id: annotationId }, { parentId: annotationId }],
    });

    return NextResponse.json({ data: { deleted: true } });
  } catch (error) {
    console.error("Annotation delete error:", error);
    return NextResponse.json({ error: "Kon annotatie niet verwijderen." }, { status: 500 });
  }
}

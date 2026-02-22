import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/db";
import DocumentModel from "@/models/Document";
import { generateAndUploadCover } from "@/lib/ai/generate-cover";

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
    }).lean();

    if (!doc) {
      return NextResponse.json({ error: "Document niet gevonden." }, { status: 404 });
    }

    return NextResponse.json({ data: doc });
  } catch (error) {
    console.error("Document GET error:", error);
    return NextResponse.json(
      { error: "Kon document niet ophalen." },
      { status: 500 }
    );
  }
}

export async function PUT(
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
    const updates = await req.json();

    // Remove fields that shouldn't be updated directly
    delete updates._id;
    delete updates.organizationId;
    delete updates.uploadedBy;
    delete updates.shortId;

    const doc = await DocumentModel.findOneAndUpdate(
      { _id: id, organizationId: session.user.organizationId },
      { $set: updates },
      { new: true }
    ).lean();

    if (!doc) {
      return NextResponse.json({ error: "Document niet gevonden." }, { status: 404 });
    }

    // Regenerate cover if cover-affecting fields changed
    const coverFields = ["title", "tags", "brandOverride"];
    const shouldRegenerateCover = coverFields.some((field) => field in updates);
    if (shouldRegenerateCover && doc.status === "ready") {
      generateAndUploadCover(id).catch((err) =>
        console.error("Cover regeneration failed:", err)
      );
    }

    return NextResponse.json({ data: doc });
  } catch (error) {
    console.error("Document PUT error:", error);
    return NextResponse.json(
      { error: "Kon document niet bijwerken." },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    const doc = await DocumentModel.findOneAndDelete({
      _id: id,
      organizationId: session.user.organizationId,
    });

    if (!doc) {
      return NextResponse.json({ error: "Document niet gevonden." }, { status: 404 });
    }

    return NextResponse.json({ message: "Document verwijderd." });
  } catch (error) {
    console.error("Document DELETE error:", error);
    return NextResponse.json(
      { error: "Kon document niet verwijderen." },
      { status: 500 }
    );
  }
}

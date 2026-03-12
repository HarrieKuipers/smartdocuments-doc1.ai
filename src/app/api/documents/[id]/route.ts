import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/db";
import DocumentModel from "@/models/Document";
import { generateAndUploadCover } from "@/lib/ai/generate-cover";
import { generateSlug } from "@/lib/slug";
import bcrypt from "bcryptjs";

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

    // Hash password if access type is password
    if (updates.access?.type === "password" && updates.access?.password) {
      updates.access.password = await bcrypt.hash(updates.access.password, 12);
    }

    // Strip _id from subdocument arrays to prevent Mongoose conflicts
    const arrayFields = ["content.keyPoints", "content.findings", "content.terms"];
    for (const field of arrayFields) {
      if (Array.isArray(updates[field])) {
        updates[field] = updates[field].map(
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          ({ _id, ...rest }: Record<string, unknown>) => rest
        );
      }
    }

    // Validate and slugify customSlug
    let unsetSlug = false;
    if ("customSlug" in updates) {
      if (updates.customSlug === "" || updates.customSlug === null) {
        delete updates.customSlug;
        unsetSlug = true;
      } else {
        const slugified = generateSlug(updates.customSlug);
        if (slugified.length < 3) {
          return NextResponse.json(
            { error: "Custom URL moet minimaal 3 tekens bevatten." },
            { status: 400 }
          );
        }
        // Check uniqueness
        const existing = await DocumentModel.findOne({
          customSlug: slugified,
          _id: { $ne: id },
        });
        if (existing) {
          return NextResponse.json(
            { error: "Deze custom URL is al in gebruik." },
            { status: 409 }
          );
        }
        updates.customSlug = slugified;
      }
    }

    const updateOp: Record<string, unknown> = { $set: updates };
    if (unsetSlug) {
      updateOp.$unset = { customSlug: "" };
    }

    const doc = await DocumentModel.findOneAndUpdate(
      { _id: id, organizationId: session.user.organizationId },
      updateOp,
      { new: true }
    ).lean();

    if (!doc) {
      return NextResponse.json({ error: "Document niet gevonden." }, { status: 404 });
    }

    // Regenerate cover if cover-affecting fields changed (only if no custom cover)
    const coverFields = ["title", "tags", "brandOverride"];
    const shouldRegenerateCover = coverFields.some((field) => field in updates);
    if (shouldRegenerateCover && doc.status === "ready" && !doc.customCoverUrl) {
      generateAndUploadCover(id).catch((err) =>
        console.error("Cover regeneration failed:", err)
      );
    }

    return NextResponse.json({ data: doc });
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error("Document PUT error:", {
      message: err.message,
      name: err.name,
      stack: err.stack,
    });
    return NextResponse.json(
      { error: `Kon document niet bijwerken: ${err.message}` },
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

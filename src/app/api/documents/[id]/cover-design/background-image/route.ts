import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/db";
import DocumentModel from "@/models/Document";
import { uploadPublicFile } from "@/lib/storage";
import { nanoid } from "nanoid";

const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

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
      .select("shortId")
      .lean();

    if (!doc) {
      return NextResponse.json({ error: "Document niet gevonden." }, { status: 404 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Geen bestand geüpload." }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Alleen JPG, PNG en WebP afbeeldingen zijn toegestaan." },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "Afbeelding mag maximaal 5MB zijn." },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.type.split("/")[1] === "jpeg" ? "jpg" : file.type.split("/")[1];
    const storageKey = `covers/bg/${doc.shortId}-${nanoid(6)}.${ext}`;

    const imageUrl = await uploadPublicFile(storageKey, buffer, file.type);

    return NextResponse.json({ data: { imageUrl } });
  } catch (error) {
    console.error("Background image upload error:", error);
    return NextResponse.json(
      { error: "Kon achtergrondafbeelding niet uploaden." },
      { status: 500 }
    );
  }
}

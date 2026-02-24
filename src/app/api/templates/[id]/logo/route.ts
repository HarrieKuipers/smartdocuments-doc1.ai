import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { uploadPublicFile, deleteFile } from "@/lib/storage";
import { nanoid } from "nanoid";
import connectDB from "@/lib/db";
import Template from "@/models/Template";

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/svg+xml",
];
const MAX_SIZE = 2 * 1024 * 1024; // 2MB

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Niet geautoriseerd." },
        { status: 401 }
      );
    }

    const { id } = await params;
    await connectDB();

    const template = await Template.findOne({
      templateId: id,
      organizationId: session.user.organizationId,
      isSystem: false,
    });

    if (!template) {
      return NextResponse.json(
        { error: "Sjabloon niet gevonden of niet bewerkbaar." },
        { status: 404 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "Geen bestand ontvangen." },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Alleen SVG, PNG, JPG en WebP zijn toegestaan." },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "Bestand is te groot. Maximum is 2MB." },
        { status: 400 }
      );
    }

    // Delete old logo if applicable
    if (template.logo && template.logo.includes("templates/")) {
      try {
        const oldKey = "templates/" + template.logo.split("templates/")[1];
        await deleteFile(oldKey);
      } catch {
        // Ignore deletion errors for old logo
      }
    }

    const ext =
      file.type === "image/svg+xml"
        ? "svg"
        : file.type === "image/jpeg"
          ? "jpg"
          : file.type.split("/")[1];
    const key = `templates/org-${session.user.organizationId}/${nanoid()}.${ext}`;

    const buffer = Buffer.from(await file.arrayBuffer());
    const logoUrl = await uploadPublicFile(key, buffer, file.type);

    template.logo = logoUrl;
    await template.save();

    return NextResponse.json({ logo: logoUrl });
  } catch (error) {
    console.error("Template logo POST error:", error);
    return NextResponse.json(
      { error: "Logo uploaden mislukt." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Niet geautoriseerd." },
        { status: 401 }
      );
    }

    const { id } = await params;
    await connectDB();

    const template = await Template.findOne({
      templateId: id,
      organizationId: session.user.organizationId,
      isSystem: false,
    });

    if (!template) {
      return NextResponse.json(
        { error: "Sjabloon niet gevonden of niet bewerkbaar." },
        { status: 404 }
      );
    }

    if (template.logo && template.logo.includes("templates/")) {
      try {
        const oldKey = "templates/" + template.logo.split("templates/")[1];
        await deleteFile(oldKey);
      } catch {
        // Ignore deletion errors
      }
    }

    template.logo = undefined;
    await template.save();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Template logo DELETE error:", error);
    return NextResponse.json(
      { error: "Logo verwijderen mislukt." },
      { status: 500 }
    );
  }
}

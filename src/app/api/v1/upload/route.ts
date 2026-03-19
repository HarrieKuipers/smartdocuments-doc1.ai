import { NextRequest, NextResponse } from "next/server";
import { authenticateApiKey, requireScope } from "@/lib/api-auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { uploadFile } from "@/lib/storage";
import { nanoid } from "nanoid";

const ALLOWED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const MAX_SIZE = 25 * 1024 * 1024; // 25MB

export async function POST(req: NextRequest) {
  try {
    const ctx = await authenticateApiKey(req);
    requireScope(ctx, "write:documents");
    checkRateLimit(ctx.apiKeyId);

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "Bestand is verplicht (form field: 'file')." },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Alleen PDF en DOCX bestanden zijn toegestaan." },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "Bestand is te groot. Maximum is 25MB." },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.type === "application/pdf" ? "pdf" : "docx";
    const storageKey = `uploads/${ctx.organizationId}/${nanoid()}.${ext}`;

    await uploadFile(storageKey, buffer, file.type);

    return NextResponse.json(
      {
        data: {
          storageKey,
          filename: file.name,
          mimeType: file.type,
          sizeBytes: file.size,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("API v1 upload error:", error);
    return NextResponse.json(
      { error: "Kon bestand niet uploaden." },
      { status: 500 }
    );
  }
}

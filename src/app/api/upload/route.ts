import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { uploadFile } from "@/lib/storage";
import { nanoid } from "nanoid";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Niet geautoriseerd." },
        { status: 401 }
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

    const allowedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Alleen PDF en DOCX bestanden zijn toegestaan." },
        { status: 400 }
      );
    }

    const maxSize = 25 * 1024 * 1024; // 25MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "Bestand is te groot. Maximum is 25MB." },
        { status: 400 }
      );
    }

    const ext = file.name.split(".").pop();
    const key = `uploads/${session.user.organizationId}/${nanoid()}.${ext}`;

    const buffer = Buffer.from(await file.arrayBuffer());
    await uploadFile(key, buffer, file.type);

    return NextResponse.json({ key });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Upload mislukt." },
      { status: 500 }
    );
  }
}

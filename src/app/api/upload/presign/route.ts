import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getPresignedUploadUrl } from "@/lib/storage";
import { nanoid } from "nanoid";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Niet geautoriseerd." }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const filename = searchParams.get("filename");
    const contentType = searchParams.get("contentType");

    if (!filename || !contentType) {
      return NextResponse.json(
        { error: "Filename en contentType zijn verplicht." },
        { status: 400 }
      );
    }

    const allowedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (!allowedTypes.includes(contentType)) {
      return NextResponse.json(
        { error: "Alleen PDF en DOCX bestanden zijn toegestaan." },
        { status: 400 }
      );
    }

    const ext = filename.split(".").pop();
    const key = `uploads/${session.user.organizationId}/${nanoid()}.${ext}`;

    const uploadUrl = await getPresignedUploadUrl(key, contentType);

    return NextResponse.json({ uploadUrl, key });
  } catch (error) {
    console.error("Presign error:", error);
    return NextResponse.json(
      { error: "Kon upload URL niet genereren." },
      { status: 500 }
    );
  }
}

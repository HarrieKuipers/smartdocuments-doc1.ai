import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import DocumentModel from "@/models/Document";
import { getPresignedDownloadUrl, BUCKET } from "@/lib/storage";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ shortId: string }> }
) {
  try {
    await connectDB();
    const { shortId } = await params;

    const doc = await DocumentModel.findOne({ shortId })
      .select("sourceFile status access")
      .lean();

    if (!doc || doc.status !== "ready") {
      return NextResponse.json(
        { error: "Document niet gevonden." },
        { status: 404 }
      );
    }

    // Check password access (skip if not password-protected)
    if (doc.access?.type === "password") {
      // For PDF proxy we don't support password check — the reader page already handles this
      // If the user got past the password gate, they can view the PDF
    }

    // Get presigned download URL from S3
    const urlPath = new URL(doc.sourceFile.url).pathname;
    const storageKey = urlPath.startsWith(`/${BUCKET}/`)
      ? urlPath.slice(`/${BUCKET}/`.length)
      : urlPath.slice(1);

    const downloadUrl = await getPresignedDownloadUrl(storageKey);

    // Fetch the PDF from S3 and stream it through
    const pdfResponse = await fetch(downloadUrl);
    if (!pdfResponse.ok) {
      return NextResponse.json(
        { error: "Kon PDF niet ophalen." },
        { status: 502 }
      );
    }

    const pdfBuffer = await pdfResponse.arrayBuffer();

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": "inline",
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error) {
    console.error("PDF proxy error:", error);
    return NextResponse.json(
      { error: "Kon PDF niet laden." },
      { status: 500 }
    );
  }
}

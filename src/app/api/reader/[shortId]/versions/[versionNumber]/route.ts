import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import DocumentModel from "@/models/Document";
import DocumentVersion from "@/models/DocumentVersion";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ shortId: string; versionNumber: string }> }
) {
  try {
    await connectDB();
    const { shortId, versionNumber } = await params;

    const doc = await DocumentModel.findOne({
      $or: [{ shortId }, { customSlug: shortId }],
      status: "ready",
    })
      .select("_id")
      .lean();

    if (!doc) {
      return NextResponse.json({ error: "Document niet gevonden." }, { status: 404 });
    }

    const version = await DocumentVersion.findOne({
      documentId: doc._id,
      versionNumber: parseInt(versionNumber),
    })
      .select("versionNumber versionLabel content pageCount languageLevel createdAt")
      .lean();

    if (!version) {
      return NextResponse.json({ error: "Versie niet gevonden." }, { status: 404 });
    }

    // Strip originalText from public response
    const { content, ...rest } = version;
    return NextResponse.json({
      data: {
        ...rest,
        content: {
          summary: content.summary,
          keyPoints: content.keyPoints,
          findings: content.findings,
          terms: content.terms,
        },
      },
    });
  } catch (error) {
    console.error("Public version get error:", error);
    return NextResponse.json({ error: "Kon versie niet ophalen." }, { status: 500 });
  }
}

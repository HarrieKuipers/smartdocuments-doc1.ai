import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import DocumentModel from "@/models/Document";
import DocumentVersion from "@/models/DocumentVersion";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ shortId: string }> }
) {
  try {
    await connectDB();
    const { shortId } = await params;

    const doc = await DocumentModel.findOne({
      $or: [{ shortId }, { customSlug: shortId }],
      status: "ready",
    })
      .select("_id currentVersion totalVersions")
      .lean();

    if (!doc) {
      return NextResponse.json({ error: "Document niet gevonden." }, { status: 404 });
    }

    if ((doc.totalVersions || 1) <= 1) {
      return NextResponse.json({ data: { versions: [], totalVersions: 1 } });
    }

    const versions = await DocumentVersion.find({ documentId: doc._id })
      .select("versionNumber versionLabel createdAt")
      .sort({ versionNumber: -1 })
      .lean();

    return NextResponse.json({
      data: {
        currentVersion: doc.currentVersion || 1,
        totalVersions: doc.totalVersions || 1,
        versions,
      },
    });
  } catch (error) {
    console.error("Public version list error:", error);
    return NextResponse.json({ error: "Kon versies niet ophalen." }, { status: 500 });
  }
}

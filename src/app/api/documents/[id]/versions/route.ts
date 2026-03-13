import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/db";
import DocumentModel from "@/models/Document";
import DocumentVersion from "@/models/DocumentVersion";

// GET: List all versions for a document
export async function GET(
  _req: NextRequest,
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
      .select("currentVersion totalVersions title")
      .lean();

    if (!doc) {
      return NextResponse.json({ error: "Document niet gevonden." }, { status: 404 });
    }

    const versions = await DocumentVersion.find({ documentId: id })
      .select("versionNumber versionLabel createdBy createdAt pageCount")
      .sort({ versionNumber: -1 })
      .populate("createdBy", "name email")
      .lean();

    return NextResponse.json({
      data: {
        currentVersion: doc.currentVersion || 1,
        totalVersions: doc.totalVersions || 1,
        versions,
      },
    });
  } catch (error) {
    console.error("Version list error:", error);
    return NextResponse.json({ error: "Kon versies niet ophalen." }, { status: 500 });
  }
}

// POST: Create a new version (snapshot current content, then allow reprocessing)
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
    const body = await req.json();

    const doc = await DocumentModel.findOne({
      _id: id,
      organizationId: session.user.organizationId,
    });

    if (!doc) {
      return NextResponse.json({ error: "Document niet gevonden." }, { status: 404 });
    }

    // Snapshot the current content as a version
    const versionNumber = doc.currentVersion || 1;
    await DocumentVersion.create({
      documentId: doc._id,
      versionNumber,
      versionLabel: body.versionLabel || `Versie ${versionNumber}`,
      sourceFile: doc.sourceFile,
      content: doc.content,
      pageCount: doc.pageCount,
      languageLevel: doc.languageLevel,
      createdBy: session.user.id,
    });

    // Update document version counters
    doc.currentVersion = versionNumber + 1;
    doc.totalVersions = (doc.totalVersions || 1) + 1;
    await doc.save();

    return NextResponse.json({
      data: {
        message: "Versie opgeslagen.",
        currentVersion: doc.currentVersion,
        totalVersions: doc.totalVersions,
      },
    });
  } catch (error) {
    console.error("Version create error:", error);
    return NextResponse.json({ error: "Kon versie niet aanmaken." }, { status: 500 });
  }
}

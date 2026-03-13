import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/db";
import DocumentModel from "@/models/Document";
import DocumentVersion from "@/models/DocumentVersion";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; versionNumber: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Niet geautoriseerd." }, { status: 401 });
    }

    await connectDB();
    const { id, versionNumber } = await params;

    // Verify ownership
    const doc = await DocumentModel.findOne({
      _id: id,
      organizationId: session.user.organizationId,
    })
      .select("_id")
      .lean();

    if (!doc) {
      return NextResponse.json({ error: "Document niet gevonden." }, { status: 404 });
    }

    const version = await DocumentVersion.findOne({
      documentId: id,
      versionNumber: parseInt(versionNumber),
    }).lean();

    if (!version) {
      return NextResponse.json({ error: "Versie niet gevonden." }, { status: 404 });
    }

    return NextResponse.json({ data: version });
  } catch (error) {
    console.error("Version get error:", error);
    return NextResponse.json({ error: "Kon versie niet ophalen." }, { status: 500 });
  }
}

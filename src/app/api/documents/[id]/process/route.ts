import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/db";
import DocumentModel from "@/models/Document";
import { processDocument } from "@/lib/ai/process-document";

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
    });

    if (!doc) {
      return NextResponse.json({ error: "Document niet gevonden." }, { status: 404 });
    }

    if (doc.status === "processing") {
      return NextResponse.json(
        { error: "Document wordt al verwerkt." },
        { status: 409 }
      );
    }

    // Start processing in background (non-blocking)
    processDocument(id).catch((error) => {
      console.error(`Background processing failed for ${id}:`, error);
    });

    return NextResponse.json({
      message: "Verwerking gestart.",
      documentId: id,
    });
  } catch (error) {
    console.error("Process route error:", error);
    return NextResponse.json(
      { error: "Kon verwerking niet starten." },
      { status: 500 }
    );
  }
}

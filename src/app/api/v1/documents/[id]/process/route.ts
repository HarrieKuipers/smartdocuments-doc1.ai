import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { authenticateApiKey, requireScope } from "@/lib/api-auth";
import { checkRateLimit } from "@/lib/rate-limit";
import DocumentModel from "@/models/Document";
import { processDocument } from "@/lib/ai/process-document";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await authenticateApiKey(req);
    requireScope(ctx, "write:documents");
    checkRateLimit(ctx.apiKeyId);

    const { id } = await params;
    await connectDB();

    const doc = await DocumentModel.findOne({
      _id: id,
      organizationId: ctx.organizationId,
    });

    if (!doc) {
      return NextResponse.json(
        { error: "Document niet gevonden." },
        { status: 404 }
      );
    }

    if (doc.status === "processing") {
      return NextResponse.json(
        { error: "Document wordt al verwerkt." },
        { status: 409 }
      );
    }

    if (doc.status === "ready") {
      return NextResponse.json(
        { error: "Document is al verwerkt. Gebruik PATCH om te herstarten." },
        { status: 409 }
      );
    }

    // Start processing in background
    processDocument(id).catch((error) => {
      console.error("Background processing failed:", error);
    });

    return NextResponse.json({
      data: {
        documentId: id,
        status: "processing",
        message: "Verwerking gestart. Gebruik GET /status om voortgang te volgen.",
      },
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("API v1 process error:", error);
    return NextResponse.json(
      { error: "Kon verwerking niet starten." },
      { status: 500 }
    );
  }
}

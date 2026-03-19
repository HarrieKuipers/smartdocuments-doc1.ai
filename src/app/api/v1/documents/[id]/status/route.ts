import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { authenticateApiKey, requireScope } from "@/lib/api-auth";
import { checkRateLimit } from "@/lib/rate-limit";
import DocumentModel from "@/models/Document";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await authenticateApiKey(req);
    requireScope(ctx, "read:documents");
    checkRateLimit(ctx.apiKeyId);

    const { id } = await params;
    await connectDB();

    const doc = await DocumentModel.findOne({
      _id: id,
      organizationId: ctx.organizationId,
    })
      .select("status processingProgress")
      .lean();

    if (!doc) {
      return NextResponse.json(
        { error: "Document niet gevonden." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      data: {
        status: doc.status,
        processingProgress: doc.processingProgress,
      },
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("API v1 status error:", error);
    return NextResponse.json(
      { error: "Kon status niet ophalen." },
      { status: 500 }
    );
  }
}

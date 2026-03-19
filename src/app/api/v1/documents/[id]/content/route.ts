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
      .select(
        "title displayTitle status content.summary content.keyPoints content.findings content.terms languageLevel"
      )
      .lean();

    if (!doc) {
      return NextResponse.json(
        { error: "Document niet gevonden." },
        { status: 404 }
      );
    }

    if (doc.status !== "ready") {
      return NextResponse.json(
        {
          error: "Document is nog niet verwerkt.",
          status: doc.status,
        },
        { status: 422 }
      );
    }

    return NextResponse.json({
      data: {
        title: doc.title,
        displayTitle: doc.displayTitle,
        languageLevel: doc.languageLevel,
        summary: doc.content?.summary,
        keyPoints: doc.content?.keyPoints,
        findings: doc.content?.findings,
        terms: doc.content?.terms,
      },
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("API v1 content error:", error);
    return NextResponse.json(
      { error: "Kon content niet ophalen." },
      { status: 500 }
    );
  }
}

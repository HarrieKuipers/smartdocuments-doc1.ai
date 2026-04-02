import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import connectDB from "@/lib/db";
import DocumentModel from "@/models/Document";
import Organization from "@/models/Organization";
import { getTemplateAsync } from "@/lib/templates.server";
import { buildPageImageUrls } from "@/lib/page-images";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ shortId: string }> }
) {
  try {
    await connectDB();
    const { shortId } = await params;

    const doc = await DocumentModel.findOne({
      $or: [{ shortId }, { customSlug: shortId }],
    }).lean();
    if (!doc) {
      return NextResponse.json({ error: "Document niet gevonden." }, { status: 404 });
    }

    if (doc.status !== "ready") {
      return NextResponse.json(
        { error: "Document is nog niet gepubliceerd." },
        { status: 403 }
      );
    }

    if (doc.isDraft) {
      return NextResponse.json(
        { error: "Dit document is nog niet gepubliceerd." },
        { status: 404 }
      );
    }

    // Check access
    if (doc.access?.type === "password") {
      const password = req.headers.get("x-document-password");
      if (!password) {
        return NextResponse.json(
          { error: "password-required", requiresPassword: true },
          { status: 401 }
        );
      }
      const isValid = await bcrypt.compare(password, doc.access.password || "");
      if (!isValid) {
        return NextResponse.json(
          { error: "Onjuist wachtwoord.", requiresPassword: true },
          { status: 401 }
        );
      }
    }

    // Get organization
    const org = await Organization.findById(doc.organizationId)
      .select("name slug logo brandColors")
      .lean();

    // Note: view counts are tracked via DocumentEvent page_view events
    // and synced to Document.analytics by the aggregate-analytics cron job

    // Strip original text from response (too large for public)
    const { content, ...docData } = doc;
    const publicContent = {
      summary: content.summary,
      keyPoints: content.keyPoints,
      findings: content.findings,
      terms: content.terms,
    };

    // Resolve full template config (DB custom templates + static fallback)
    const templateConfig = await getTemplateAsync(doc.template);

    const pageImages = doc.pageCount
      ? buildPageImageUrls(doc._id.toString(), doc.pageCount, doc.pageLabelOffset || 0)
      : [];

    return NextResponse.json(
      {
        data: {
          ...docData,
          pageImages,
          content: publicContent,
          organization: org,
          templateConfig,
        },
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (error) {
    console.error("Reader GET error:", error);
    return NextResponse.json(
      { error: "Kon document niet ophalen." },
      { status: 500 }
    );
  }
}

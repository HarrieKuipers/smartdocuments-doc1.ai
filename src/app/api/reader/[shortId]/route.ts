import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import DocumentModel from "@/models/Document";
import Organization from "@/models/Organization";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ shortId: string }> }
) {
  try {
    await connectDB();
    const { shortId } = await params;

    const doc = await DocumentModel.findOne({ shortId }).lean();
    if (!doc) {
      return NextResponse.json({ error: "Document niet gevonden." }, { status: 404 });
    }

    if (doc.status !== "ready") {
      return NextResponse.json(
        { error: "Document is nog niet gepubliceerd." },
        { status: 403 }
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
      // TODO: bcrypt compare
    }

    // Get organization
    const org = await Organization.findById(doc.organizationId)
      .select("name slug logo brandColors")
      .lean();

    // Increment view count
    await DocumentModel.findByIdAndUpdate(doc._id, {
      $inc: { "analytics.totalViews": 1 },
    });

    // Strip original text from response (too large for public)
    const { content, ...docData } = doc;
    const publicContent = {
      summary: content.summary,
      keyPoints: content.keyPoints,
      findings: content.findings,
      terms: content.terms,
    };

    return NextResponse.json(
      {
        data: {
          ...docData,
          content: publicContent,
          organization: org,
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

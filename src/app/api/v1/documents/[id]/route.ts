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
      .select("-content.originalText")
      .lean();

    if (!doc) {
      return NextResponse.json(
        { error: "Document niet gevonden." },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: doc });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("API v1 document get error:", error);
    return NextResponse.json(
      { error: "Kon document niet ophalen." },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await authenticateApiKey(req);
    requireScope(ctx, "write:documents");
    checkRateLimit(ctx.apiKeyId);

    const { id } = await params;
    const updates = await req.json();

    await connectDB();

    const allowedFields = [
      "title",
      "displayTitle",
      "tags",
      "description",
      "access",
      "templateId",
      "chatMode",
      "language",
    ];

    const safeUpdates: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        safeUpdates[field] = updates[field];
      }
    }

    const doc = await DocumentModel.findOneAndUpdate(
      { _id: id, organizationId: ctx.organizationId },
      safeUpdates,
      { new: true }
    )
      .select("-content.originalText")
      .lean();

    if (!doc) {
      return NextResponse.json(
        { error: "Document niet gevonden." },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: doc });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("API v1 document update error:", error);
    return NextResponse.json(
      { error: "Kon document niet bijwerken." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await authenticateApiKey(req);
    requireScope(ctx, "write:documents");
    checkRateLimit(ctx.apiKeyId);

    const { id } = await params;
    await connectDB();

    const result = await DocumentModel.findOneAndDelete({
      _id: id,
      organizationId: ctx.organizationId,
    });

    if (!result) {
      return NextResponse.json(
        { error: "Document niet gevonden." },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Document verwijderd." });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("API v1 document delete error:", error);
    return NextResponse.json(
      { error: "Kon document niet verwijderen." },
      { status: 500 }
    );
  }
}

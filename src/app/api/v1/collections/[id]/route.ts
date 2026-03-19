import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { authenticateApiKey, requireScope } from "@/lib/api-auth";
import { checkRateLimit } from "@/lib/rate-limit";
import Collection from "@/models/Collection";
import DocumentModel from "@/models/Document";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await authenticateApiKey(req);
    requireScope(ctx, "read:collections");
    checkRateLimit(ctx.apiKeyId);

    const { id } = await params;
    await connectDB();

    const collection = await Collection.findOne({
      _id: id,
      organizationId: ctx.organizationId,
    }).lean();

    if (!collection) {
      return NextResponse.json(
        { error: "Collectie niet gevonden." },
        { status: 404 }
      );
    }

    const documents = await DocumentModel.find({
      collectionId: id,
      organizationId: ctx.organizationId,
    })
      .select("shortId slug title displayTitle status tags createdAt analytics")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      data: { ...collection, documents },
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("API v1 collection get error:", error);
    return NextResponse.json(
      { error: "Kon collectie niet ophalen." },
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
    requireScope(ctx, "write:collections");
    checkRateLimit(ctx.apiKeyId);

    const { id } = await params;
    const updates = await req.json();

    await connectDB();

    const allowedUpdates: Record<string, unknown> = {};
    if (updates.name !== undefined) allowedUpdates.name = updates.name;
    if (updates.description !== undefined) allowedUpdates.description = updates.description;

    const collection = await Collection.findOneAndUpdate(
      { _id: id, organizationId: ctx.organizationId },
      allowedUpdates,
      { new: true }
    ).lean();

    if (!collection) {
      return NextResponse.json(
        { error: "Collectie niet gevonden." },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: collection });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("API v1 collection update error:", error);
    return NextResponse.json(
      { error: "Kon collectie niet bijwerken." },
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
    requireScope(ctx, "write:collections");
    checkRateLimit(ctx.apiKeyId);

    const { id } = await params;
    await connectDB();

    const result = await Collection.findOneAndDelete({
      _id: id,
      organizationId: ctx.organizationId,
    });

    if (!result) {
      return NextResponse.json(
        { error: "Collectie niet gevonden." },
        { status: 404 }
      );
    }

    // Unlink documents from this collection
    await DocumentModel.updateMany(
      { collectionId: id },
      { $unset: { collectionId: "" } }
    );

    return NextResponse.json({ message: "Collectie verwijderd." });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("API v1 collection delete error:", error);
    return NextResponse.json(
      { error: "Kon collectie niet verwijderen." },
      { status: 500 }
    );
  }
}

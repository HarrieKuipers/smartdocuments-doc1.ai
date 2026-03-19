import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { authenticateApiKey, requireScope } from "@/lib/api-auth";
import { checkRateLimit } from "@/lib/rate-limit";
import Collection from "@/models/Collection";
import { generateSlug } from "@/lib/slug";

export async function GET(req: NextRequest) {
  try {
    const ctx = await authenticateApiKey(req);
    requireScope(ctx, "read:collections");
    checkRateLimit(ctx.apiKeyId);

    await connectDB();

    const collections = await Collection.find({
      organizationId: ctx.organizationId,
    })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ data: collections });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("API v1 collections list error:", error);
    return NextResponse.json(
      { error: "Kon collecties niet ophalen." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await authenticateApiKey(req);
    requireScope(ctx, "write:collections");
    checkRateLimit(ctx.apiKeyId);

    const { name, description } = await req.json();

    if (!name || typeof name !== "string") {
      return NextResponse.json(
        { error: "Naam is verplicht." },
        { status: 400 }
      );
    }

    await connectDB();

    const slug = generateSlug(name);

    const collection = await Collection.create({
      name: name.trim(),
      slug,
      description: description?.trim() || "",
      organizationId: ctx.organizationId,
      documentCount: 0,
    });

    return NextResponse.json({ data: collection }, { status: 201 });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("API v1 collection create error:", error);
    return NextResponse.json(
      { error: "Kon collectie niet aanmaken." },
      { status: 500 }
    );
  }
}

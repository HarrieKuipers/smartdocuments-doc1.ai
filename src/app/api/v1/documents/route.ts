import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { authenticateApiKey, requireScope } from "@/lib/api-auth";
import { checkRateLimit } from "@/lib/rate-limit";
import DocumentModel from "@/models/Document";
import User from "@/models/User";
import { generateShortId } from "@/lib/nanoid";
import { generateSlug } from "@/lib/slug";

export async function GET(req: NextRequest) {
  try {
    const ctx = await authenticateApiKey(req);
    requireScope(ctx, "read:documents");
    checkRateLimit(ctx.apiKeyId);

    await connectDB();

    const searchParams = req.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const collectionId = searchParams.get("collectionId");
    const tag = searchParams.get("tag");

    const filter: Record<string, unknown> = {
      organizationId: ctx.organizationId,
    };
    if (status) filter.status = status;
    if (collectionId) filter.collectionId = collectionId;
    if (tag) filter.tags = tag;
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { displayTitle: { $regex: search, $options: "i" } },
        { tags: { $regex: search, $options: "i" } },
      ];
    }

    const [docs, total] = await Promise.all([
      DocumentModel.find(filter)
        .select(
          "shortId slug title displayTitle status tags description pageCount language publishedAt createdAt updatedAt analytics"
        )
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      DocumentModel.countDocuments(filter),
    ]);

    return NextResponse.json({
      data: docs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("API v1 documents list error:", error);
    return NextResponse.json(
      { error: "Kon documenten niet ophalen." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await authenticateApiKey(req);
    requireScope(ctx, "write:documents");
    checkRateLimit(ctx.apiKeyId);

    const body = await req.json();
    const { title, filename, mimeType, sizeBytes, storageKey, language, tags, description } = body;

    if (!title || !storageKey) {
      return NextResponse.json(
        { error: "title en storageKey zijn verplicht." },
        { status: 400 }
      );
    }

    await connectDB();

    const slug = generateSlug(title);
    const shortId = generateShortId();

    const doc = await DocumentModel.create({
      shortId,
      slug,
      organizationId: ctx.organizationId,
      title,
      language: language || "nl",
      tags: tags || [],
      description: description || "",
      sourceFile: {
        url: storageKey,
        filename: filename || "document",
        mimeType: mimeType || "application/pdf",
        sizeBytes: sizeBytes || 0,
        uploadedAt: new Date(),
      },
      status: "uploading",
      content: {
        originalText: "",
        summary: { original: "", B1: "", B2: "", C1: "" },
        keyPoints: [],
        findings: [],
        terms: [],
      },
      analytics: {
        totalViews: 0,
        uniqueViews: 0,
        totalDownloads: 0,
        averageReadTime: 0,
        chatInteractions: 0,
      },
    });

    return NextResponse.json({ data: doc }, { status: 201 });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("API v1 document create error:", error);
    return NextResponse.json(
      { error: "Kon document niet aanmaken." },
      { status: 500 }
    );
  }
}

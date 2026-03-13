import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/db";
import DocumentModel from "@/models/Document";
import User from "@/models/User";
import { generateShortId } from "@/lib/nanoid";
import { generateSlug } from "@/lib/slug";
import { getFileUrl } from "@/lib/storage";
import { canCreateDocument } from "@/lib/plan-limits";
import { PlanType } from "@/lib/stripe";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Niet geautoriseerd." }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    const collectionId = searchParams.get("collectionId");
    const sortBy = searchParams.get("sortBy") || (search ? "relevance" : "newest");
    const tag = searchParams.get("tag");

    const filter: Record<string, unknown> = {
      organizationId: session.user.organizationId,
    };
    if (status) filter.status = status;
    if (collectionId) filter.collectionId = collectionId;
    if (tag) filter.tags = tag;

    let useTextSearch = false;

    if (search) {
      // Try full-text search first
      filter.$text = { $search: search };
      useTextSearch = true;
    }

    // Build sort object
    type SortValue = 1 | -1 | { $meta: "textScore" };
    let sort: Record<string, SortValue> = { createdAt: -1 };
    const projection: Record<string, unknown> = {};

    if (useTextSearch) {
      projection.score = { $meta: "textScore" };
    }

    switch (sortBy) {
      case "relevance":
        if (useTextSearch) {
          sort = { score: { $meta: "textScore" } };
        }
        break;
      case "newest":
        sort = { createdAt: -1 };
        break;
      case "oldest":
        sort = { createdAt: 1 };
        break;
      case "most-viewed":
        sort = { "analytics.totalViews": -1 };
        break;
      case "title":
        sort = { title: 1 };
        break;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let docs: any[];
    let total: number;

    try {
      const query = useTextSearch
        ? DocumentModel.find(filter, projection)
        : DocumentModel.find(filter);

      [docs, total] = await Promise.all([
        query
          .sort(sort)
          .skip((page - 1) * limit)
          .limit(limit)
          .lean(),
        DocumentModel.countDocuments(filter),
      ]);
    } catch {
      // Text search may fail if index not yet created; fall back
      docs = [];
      total = 0;
    }

    // Fallback to regex search if text search returned no results
    if (search && total === 0) {
      delete filter.$text;
      useTextSearch = false;
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { displayTitle: { $regex: search, $options: "i" } },
        { tags: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { authors: { $regex: search, $options: "i" } },
      ];

      const fallbackSort: Record<string, 1 | -1> =
        sortBy === "most-viewed"
          ? { "analytics.totalViews": -1 }
          : sortBy === "oldest"
            ? { createdAt: 1 }
            : sortBy === "title"
              ? { title: 1 }
              : { createdAt: -1 };

      [docs, total] = await Promise.all([
        DocumentModel.find(filter)
          .sort(fallbackSort)
          .skip((page - 1) * limit)
          .limit(limit)
          .lean(),
        DocumentModel.countDocuments(filter),
      ]);
    }

    // Collect unique tags from the fetched documents for filter chips
    const allTags: string[] = [];
    for (const doc of docs) {
      const d = doc as Record<string, unknown>;
      if (Array.isArray(d.tags)) {
        for (const t of d.tags as string[]) {
          if (t && !allTags.includes(t)) allTags.push(t);
        }
      }
    }

    return NextResponse.json({
      data: docs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      tags: allTags,
    });
  } catch (error) {
    console.error("Documents GET error:", error);
    return NextResponse.json(
      { error: "Kon documenten niet ophalen." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Niet geautoriseerd." }, { status: 401 });
    }

    await connectDB();

    // Check plan limits
    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: "Gebruiker niet gevonden." }, { status: 404 });
    }

    if (!canCreateDocument(user.plan as PlanType, user.documentsUsed)) {
      return NextResponse.json(
        { error: "Je hebt het maximaal aantal documenten voor je abonnement bereikt." },
        { status: 403 }
      );
    }

    const { filename, mimeType, sizeBytes, storageKey, language } = await req.json();

    const title = filename.replace(/\.[^.]+$/, "");
    const shortId = generateShortId();
    const slug = `${generateSlug(title)}-${shortId}`;

    const doc = await DocumentModel.create({
      shortId,
      slug,
      organizationId: session.user.organizationId,
      uploadedBy: session.user.id,
      title,
      language: language === "en" ? "en" : "nl",
      sourceFile: {
        url: getFileUrl(storageKey),
        filename,
        mimeType,
        sizeBytes,
        uploadedAt: new Date(),
      },
      status: "uploading",
    });

    // Increment user document count
    await User.findByIdAndUpdate(session.user.id, {
      $inc: { documentsUsed: 1 },
    });

    return NextResponse.json({ data: doc }, { status: 201 });
  } catch (error) {
    console.error("Documents POST error:", error);
    return NextResponse.json(
      { error: "Kon document niet aanmaken." },
      { status: 500 }
    );
  }
}

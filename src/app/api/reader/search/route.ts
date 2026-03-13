import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import DocumentModel from "@/models/Document";
import Organization from "@/models/Organization";
import Collection from "@/models/Collection";

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const orgSlug = searchParams.get("orgSlug");
    const q = searchParams.get("q")?.trim() || "";
    const collectionId = searchParams.get("collectionId");
    const tag = searchParams.get("tag");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20")));

    if (!orgSlug) {
      return NextResponse.json(
        { error: "orgSlug is verplicht." },
        { status: 400 }
      );
    }

    // Lookup organization
    const org = await Organization.findOne({ slug: orgSlug })
      .select("_id name slug logo brandColors")
      .lean();

    if (!org) {
      return NextResponse.json(
        { error: "Organisatie niet gevonden." },
        { status: 404 }
      );
    }

    // Build base filter: only published, non-draft documents
    const filter: Record<string, unknown> = {
      organizationId: org._id,
      status: "ready",
      isDraft: { $ne: true },
    };

    if (collectionId) {
      filter.collectionId = collectionId;
    }

    if (tag) {
      filter.tags = tag;
    }

    const projection =
      "title displayTitle shortId slug description coverImageUrl customCoverUrl tags authors publicationDate pageCount createdAt";

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let docs: any[] = [];
    let total: number = 0;

    if (q) {
      // Try text search first
      try {
        const textFilter = { ...filter, $text: { $search: q } };
        total = await DocumentModel.countDocuments(textFilter);
        docs = await DocumentModel.find(textFilter)
          .select(`${projection}`)
          .sort({ score: { $meta: "textScore" } })
          .skip((page - 1) * limit)
          .limit(limit)
          .lean();
      } catch {
        docs = [];
        total = 0;
      }

      // Fallback to regex if no text results
      if (docs.length === 0 && total === 0) {
        const regex = { $regex: q, $options: "i" };
        const regexFilter = {
          ...filter,
          $or: [
            { title: regex },
            { displayTitle: regex },
            { description: regex },
            { tags: regex },
            { authors: regex },
          ],
        };
        total = await DocumentModel.countDocuments(regexFilter);
        docs = await DocumentModel.find(regexFilter)
          .select(projection)
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .lean();
      }
    } else {
      // No search query: return all published docs
      total = await DocumentModel.countDocuments(filter);
      docs = await DocumentModel.find(filter)
        .select(projection)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();
    }

    // Get available tags for filtering
    const allTags = await DocumentModel.distinct("tags", {
      organizationId: org._id,
      status: "ready",
      isDraft: { $ne: true },
    });

    // Get available collections
    const collections = await Collection.find({
      organizationId: org._id,
    })
      .select("_id name slug")
      .sort({ name: 1 })
      .lean();

    return NextResponse.json({
      data: {
        documents: docs,
        organization: org,
        tags: allTags.sort(),
        collections,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Public search error:", error);
    return NextResponse.json(
      { error: "Zoeken mislukt." },
      { status: 500 }
    );
  }
}

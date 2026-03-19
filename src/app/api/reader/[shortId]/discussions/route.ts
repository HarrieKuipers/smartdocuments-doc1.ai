import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import DocumentModel from "@/models/Document";
import Discussion from "@/models/Discussion";
import { auth } from "@/lib/auth";

// GET: List discussions for a document
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ shortId: string }> }
) {
  try {
    await connectDB();
    const { shortId } = await params;

    const doc = await DocumentModel.findOne({
      $or: [{ shortId }, { customSlug: shortId }],
      status: "ready",
    })
      .select("_id discussionsEnabled")
      .lean();

    if (!doc) {
      return NextResponse.json(
        { error: "Document niet gevonden." },
        { status: 404 }
      );
    }

    if (!doc.discussionsEnabled) {
      return NextResponse.json(
        { error: "Discussies zijn niet ingeschakeld voor dit document." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const sort = searchParams.get("sort") || "recent"; // recent | popular
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);

    const filter: Record<string, unknown> = { documentId: doc._id };
    if (category) filter.category = category;

    const sortOption: Record<string, 1 | -1> =
      sort === "popular"
        ? { isPinned: -1, upvotes: -1, lastActivityAt: -1 }
        : { isPinned: -1, lastActivityAt: -1 };

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [discussions, total, recentCount] = await Promise.all([
      Discussion.find(filter)
        .sort(sortOption)
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Discussion.countDocuments(filter),
      Discussion.countDocuments({
        documentId: doc._id,
        lastActivityAt: { $gte: oneDayAgo },
      }),
    ]);

    return NextResponse.json({
      data: {
        discussions,
        total,
        recentCount,
        page,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Discussions list error:", error);
    return NextResponse.json(
      { error: "Kon discussies niet ophalen." },
      { status: 500 }
    );
  }
}

// POST: Create a new discussion (requires authentication)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ shortId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Je moet ingelogd zijn om een discussie te starten." },
        { status: 401 }
      );
    }

    await connectDB();
    const { shortId } = await params;

    const doc = await DocumentModel.findOne({
      $or: [{ shortId }, { customSlug: shortId }],
      status: "ready",
    })
      .select("_id discussionsEnabled")
      .lean();

    if (!doc) {
      return NextResponse.json(
        { error: "Document niet gevonden." },
        { status: 404 }
      );
    }

    if (!doc.discussionsEnabled) {
      return NextResponse.json(
        { error: "Discussies zijn niet ingeschakeld voor dit document." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { title, content, category, referencedSection } = body;

    if (!title?.trim() || !content?.trim()) {
      return NextResponse.json(
        { error: "Titel en inhoud zijn verplicht." },
        { status: 400 }
      );
    }

    if (title.trim().length > 200) {
      return NextResponse.json(
        { error: "Titel mag maximaal 200 tekens bevatten." },
        { status: 400 }
      );
    }

    if (content.trim().length > 5000) {
      return NextResponse.json(
        { error: "Inhoud mag maximaal 5000 tekens bevatten." },
        { status: 400 }
      );
    }

    const discussion = await Discussion.create({
      documentId: doc._id,
      authorId: session.user.id,
      authorName: session.user.name || "Gebruiker",
      title: title.trim(),
      content: content.trim(),
      category: category || "discussie",
      referencedSection: referencedSection || undefined,
    });

    return NextResponse.json({ data: discussion }, { status: 201 });
  } catch (error) {
    console.error("Discussion create error:", error);
    return NextResponse.json(
      { error: "Kon discussie niet aanmaken." },
      { status: 500 }
    );
  }
}

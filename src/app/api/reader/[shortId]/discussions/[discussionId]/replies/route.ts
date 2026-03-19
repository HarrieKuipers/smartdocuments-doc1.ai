import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import DocumentModel from "@/models/Document";
import Discussion from "@/models/Discussion";
import DiscussionReply from "@/models/DiscussionReply";
import User from "@/models/User";
import { auth } from "@/lib/auth";

// GET: List replies for a discussion
export async function GET(
  req: NextRequest,
  {
    params,
  }: { params: Promise<{ shortId: string; discussionId: string }> }
) {
  try {
    await connectDB();
    const { discussionId } = await params;

    const discussion = await Discussion.findById(discussionId)
      .select("_id documentId")
      .lean();
    if (!discussion) {
      return NextResponse.json(
        { error: "Discussie niet gevonden." },
        { status: 404 }
      );
    }

    const replies = await DiscussionReply.find({ discussionId })
      .sort({ createdAt: 1 })
      .lean();

    return NextResponse.json({ data: { replies } });
  } catch (error) {
    console.error("Discussion replies error:", error);
    return NextResponse.json(
      { error: "Kon reacties niet ophalen." },
      { status: 500 }
    );
  }
}

// POST: Create a reply (requires authentication)
export async function POST(
  req: NextRequest,
  {
    params,
  }: { params: Promise<{ shortId: string; discussionId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Je moet ingelogd zijn om te reageren." },
        { status: 401 }
      );
    }

    await connectDB();
    const { shortId, discussionId } = await params;

    const doc = await DocumentModel.findOne({
      $or: [{ shortId }, { customSlug: shortId }],
      status: "ready",
    })
      .select("_id organizationId authors")
      .lean();

    if (!doc) {
      return NextResponse.json(
        { error: "Document niet gevonden." },
        { status: 404 }
      );
    }

    const discussion = await Discussion.findById(discussionId).lean();
    if (!discussion) {
      return NextResponse.json(
        { error: "Discussie niet gevonden." },
        { status: 404 }
      );
    }

    if (discussion.isClosed) {
      return NextResponse.json(
        { error: "Deze discussie is gesloten." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { content, parentReplyId } = body;

    if (!content?.trim()) {
      return NextResponse.json(
        { error: "Reactie mag niet leeg zijn." },
        { status: 400 }
      );
    }

    if (content.trim().length > 3000) {
      return NextResponse.json(
        { error: "Reactie mag maximaal 3000 tekens bevatten." },
        { status: 400 }
      );
    }

    // Check if the replying user's name matches one of the document authors
    const userName = session.user.name || "";
    const isDocumentOwner =
      Array.isArray(doc.authors) &&
      doc.authors.some(
        (a: string) => a.toLowerCase() === userName.toLowerCase()
      );

    const reply = await DiscussionReply.create({
      discussionId,
      authorId: session.user.id,
      authorName: session.user.name || "Gebruiker",
      content: content.trim(),
      parentReplyId: parentReplyId || undefined,
      isDocumentOwner,
    });

    // Update discussion reply count and last activity
    await Discussion.findByIdAndUpdate(discussionId, {
      $inc: { replyCount: 1 },
      lastActivityAt: new Date(),
    });

    return NextResponse.json({ data: reply }, { status: 201 });
  } catch (error) {
    console.error("Discussion reply create error:", error);
    return NextResponse.json(
      { error: "Kon reactie niet plaatsen." },
      { status: 500 }
    );
  }
}

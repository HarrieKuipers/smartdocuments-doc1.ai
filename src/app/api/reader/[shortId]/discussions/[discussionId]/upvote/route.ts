import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/db";
import Discussion from "@/models/Discussion";
import { auth } from "@/lib/auth";

// POST: Toggle upvote on a discussion
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
        { error: "Je moet ingelogd zijn om te stemmen." },
        { status: 401 }
      );
    }

    await connectDB();
    const { discussionId } = await params;

    const userId = new mongoose.Types.ObjectId(session.user.id);

    const discussion = await Discussion.findById(discussionId);
    if (!discussion) {
      return NextResponse.json(
        { error: "Discussie niet gevonden." },
        { status: 404 }
      );
    }

    const alreadyUpvoted = discussion.upvotedBy.some(
      (id: mongoose.Types.ObjectId) => id.equals(userId)
    );

    if (alreadyUpvoted) {
      discussion.upvotedBy = discussion.upvotedBy.filter(
        (id: mongoose.Types.ObjectId) => !id.equals(userId)
      );
      discussion.upvotes = Math.max(0, discussion.upvotes - 1);
    } else {
      discussion.upvotedBy.push(userId);
      discussion.upvotes += 1;
    }

    await discussion.save();

    return NextResponse.json({
      data: {
        upvotes: discussion.upvotes,
        hasUpvoted: !alreadyUpvoted,
      },
    });
  } catch (error) {
    console.error("Discussion upvote error:", error);
    return NextResponse.json(
      { error: "Kon stem niet verwerken." },
      { status: 500 }
    );
  }
}

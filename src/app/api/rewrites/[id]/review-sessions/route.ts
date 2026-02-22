import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/db";
import DocumentRewrite from "@/models/DocumentRewrite";
import ReviewSession from "@/models/ReviewSession";
import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";

// Create a review session (share link)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Niet geautoriseerd." },
        { status: 401 }
      );
    }

    await connectDB();
    const { id } = await params;

    const rewrite = await DocumentRewrite.findOne({
      _id: id,
      organizationId: session.user.organizationId,
    });

    if (!rewrite) {
      return NextResponse.json(
        { error: "Rewrite niet gevonden." },
        { status: 404 }
      );
    }

    if (!["rewritten", "editing", "approved_with_changes"].includes(rewrite.status)) {
      return NextResponse.json(
        { error: "Document kan niet gedeeld worden in huidige status." },
        { status: 400 }
      );
    }

    const { reviewerName, reviewerEmail, pin, expiresInDays = 30 } =
      await req.json();

    const token = randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    let pinHash: string | undefined;
    if (pin) {
      pinHash = await bcrypt.hash(pin, 10);
    }

    const reviewSession = await ReviewSession.create({
      rewriteId: rewrite._id,
      documentId: rewrite.documentId,
      versionNumber: rewrite.activeVersionNumber,
      token,
      pin: pinHash,
      reviewerName,
      reviewerEmail,
      status: "pending",
      feedback: [],
      expiresAt,
    });

    // Update rewrite status
    if (rewrite.status !== "shared_for_review") {
      const oldStatus = rewrite.status;
      rewrite.status = "shared_for_review";
      rewrite.statusHistory.push({
        from: oldStatus,
        to: "shared_for_review",
        changedAt: new Date(),
        changedBy: "user",
        userId: session.user.id as unknown as import("mongoose").Types.ObjectId,
      });
      await rewrite.save();
    }

    return NextResponse.json({
      data: {
        ...reviewSession.toObject(),
        reviewUrl: `/review/${token}`,
      },
    }, { status: 201 });
  } catch (error) {
    console.error("Review session POST error:", error);
    return NextResponse.json(
      { error: "Kon review-link niet aanmaken." },
      { status: 500 }
    );
  }
}

// List review sessions for a rewrite
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Niet geautoriseerd." },
        { status: 401 }
      );
    }

    await connectDB();
    const { id } = await params;

    const rewrite = await DocumentRewrite.findOne({
      _id: id,
      organizationId: session.user.organizationId,
    });

    if (!rewrite) {
      return NextResponse.json(
        { error: "Rewrite niet gevonden." },
        { status: 404 }
      );
    }

    const sessions = await ReviewSession.find({
      rewriteId: id,
    })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ data: sessions });
  } catch (error) {
    console.error("Review sessions GET error:", error);
    return NextResponse.json(
      { error: "Kon review-sessies niet ophalen." },
      { status: 500 }
    );
  }
}

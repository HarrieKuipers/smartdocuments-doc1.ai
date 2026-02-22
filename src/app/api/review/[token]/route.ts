import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import ReviewSession from "@/models/ReviewSession";
import DocumentRewrite from "@/models/DocumentRewrite";
import DocumentModel from "@/models/Document";
import bcrypt from "bcryptjs";

// Public: Load review data by token
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    await connectDB();
    const { token } = await params;

    const reviewSession = await ReviewSession.findOne({ token });

    if (!reviewSession) {
      return NextResponse.json(
        { error: "Review-link niet gevonden." },
        { status: 404 }
      );
    }

    // Check expiry
    if (new Date() > reviewSession.expiresAt) {
      return NextResponse.json(
        { error: "Deze review-link is verlopen." },
        { status: 410 }
      );
    }

    // Check pin if set
    if (reviewSession.pin) {
      const pin = req.nextUrl.searchParams.get("pin");
      if (!pin) {
        return NextResponse.json(
          { error: "pin_required", requiresPin: true },
          { status: 401 }
        );
      }
      const isValid = await bcrypt.compare(pin, reviewSession.pin);
      if (!isValid) {
        return NextResponse.json(
          { error: "Ongeldige pincode." },
          { status: 401 }
        );
      }
    }

    // Get the rewrite with the correct version
    const rewrite = await DocumentRewrite.findById(reviewSession.rewriteId);
    if (!rewrite) {
      return NextResponse.json(
        { error: "Document niet gevonden." },
        { status: 404 }
      );
    }

    const version = rewrite.versions.find(
      (v) => v.versionNumber === reviewSession.versionNumber
    );

    if (!version) {
      return NextResponse.json(
        { error: "Versie niet gevonden." },
        { status: 404 }
      );
    }

    // Get document metadata
    const doc = await DocumentModel.findById(reviewSession.documentId)
      .select("title organizationId template brandOverride")
      .populate("organizationId", "name logo brandColors")
      .lean();

    // Mark as opened if first time
    if (!reviewSession.openedAt) {
      reviewSession.openedAt = new Date();
      if (reviewSession.status === "pending") {
        reviewSession.status = "in_progress";
      }
      await reviewSession.save();

      // Update rewrite status to in_review
      if (rewrite.status === "shared_for_review") {
        rewrite.status = "in_review";
        rewrite.statusHistory.push({
          from: "shared_for_review",
          to: "in_review",
          changedAt: new Date(),
          changedBy: "client",
        });
        await rewrite.save();
      }
    }

    return NextResponse.json({
      data: {
        document: doc,
        content: version.content,
        originalContent: version.originalContent,
        diffs: version.diffs,
        b1Score: version.b1Score,
        status: reviewSession.status,
        feedback: reviewSession.feedback,
        generalFeedback: reviewSession.generalFeedback,
        versionNumber: version.versionNumber,
      },
    });
  } catch (error) {
    console.error("Review GET error:", error);
    return NextResponse.json(
      { error: "Kon review niet laden." },
      { status: 500 }
    );
  }
}

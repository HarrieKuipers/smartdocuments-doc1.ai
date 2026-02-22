import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import ReviewSession from "@/models/ReviewSession";
import DocumentRewrite from "@/models/DocumentRewrite";
import type { DocumentRewriteStatus } from "@/types/rewrite";

// Public: Submit final status for a review
export async function POST(
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

    if (new Date() > reviewSession.expiresAt) {
      return NextResponse.json(
        { error: "Deze review-link is verlopen." },
        { status: 410 }
      );
    }

    if (reviewSession.submittedAt) {
      return NextResponse.json(
        { error: "Review is al ingediend." },
        { status: 400 }
      );
    }

    const { status } = await req.json();

    const validStatuses = ["approved", "approved_with_changes", "rejected"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: "Ongeldige status." },
        { status: 400 }
      );
    }

    reviewSession.status = status;
    reviewSession.submittedAt = new Date();
    await reviewSession.save();

    // Update rewrite status based on review outcome
    const rewrite = await DocumentRewrite.findById(reviewSession.rewriteId);
    if (rewrite) {
      const oldStatus = rewrite.status;

      let newStatus: DocumentRewriteStatus;
      switch (status) {
        case "approved":
          newStatus = "approved";
          break;
        case "approved_with_changes":
          newStatus = "approved_with_changes";
          break;
        case "rejected":
          newStatus = "needs_revision";
          break;
        default:
          newStatus = "feedback_received";
      }

      rewrite.status = newStatus;
      rewrite.statusHistory.push({
        from: oldStatus,
        to: newStatus,
        changedAt: new Date(),
        changedBy: "client",
        note: `Review ${status} door ${reviewSession.reviewerName || "reviewer"}`,
      });
      await rewrite.save();
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Review status POST error:", error);
    return NextResponse.json(
      { error: "Kon status niet bijwerken." },
      { status: 500 }
    );
  }
}

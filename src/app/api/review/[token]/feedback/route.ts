import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import ReviewSession from "@/models/ReviewSession";
import DocumentRewrite from "@/models/DocumentRewrite";
import { randomUUID } from "crypto";

// Public: Submit feedback for a review
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
        { error: "Feedback is al ingediend." },
        { status: 400 }
      );
    }

    const { feedback, generalFeedback, author } = await req.json();

    if (!author) {
      return NextResponse.json(
        { error: "Naam is verplicht." },
        { status: 400 }
      );
    }

    // Add feedback items
    if (feedback && Array.isArray(feedback)) {
      for (const item of feedback) {
        reviewSession.feedback.push({
          id: randomUUID(),
          sectionId: item.sectionId,
          sectionTitle: item.sectionTitle,
          comment: item.comment,
          type: item.type || "general",
          createdAt: new Date(),
          author,
        });
      }
    }

    if (generalFeedback) {
      reviewSession.generalFeedback = generalFeedback;
    }

    await reviewSession.save();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Review feedback POST error:", error);
    return NextResponse.json(
      { error: "Kon feedback niet opslaan." },
      { status: 500 }
    );
  }
}

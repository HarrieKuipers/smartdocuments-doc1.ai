import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/db";
import DocumentRewrite from "@/models/DocumentRewrite";

// Save editor changes (new version)
export async function PUT(
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

    const { content } = await req.json();

    if (!content) {
      return NextResponse.json(
        { error: "Content is verplicht." },
        { status: 400 }
      );
    }

    // Create a new version based on the current active version
    const currentVersion = rewrite.versions.find(
      (v) => v.versionNumber === rewrite.activeVersionNumber
    );

    const newVersionNumber =
      Math.max(0, ...rewrite.versions.map((v) => v.versionNumber)) + 1;

    rewrite.versions.push({
      versionNumber: newVersionNumber,
      content,
      originalContent: currentVersion?.originalContent || "",
      diffs: [], // Diffs will be recalculated client-side
      b1Score: currentVersion?.b1Score || 0,
      rulesApplied: currentVersion?.rulesApplied || [],
      createdAt: new Date(),
    });

    rewrite.activeVersionNumber = newVersionNumber;

    // Update status if coming from feedback
    if (rewrite.status === "needs_revision" || rewrite.status === "feedback_received") {
      const oldStatus = rewrite.status;
      rewrite.status = "editing";
      rewrite.statusHistory.push({
        from: oldStatus,
        to: "editing",
        changedAt: new Date(),
        changedBy: "user",
        userId: session.user.id as unknown as import("mongoose").Types.ObjectId,
      });
    }

    await rewrite.save();

    return NextResponse.json({ data: rewrite });
  } catch (error) {
    console.error("Rewrite content PUT error:", error);
    return NextResponse.json(
      { error: "Kon wijzigingen niet opslaan." },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/db";
import DocumentRewrite from "@/models/DocumentRewrite";

export async function POST(
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

    if (!["rewritten", "approved", "approved_with_changes", "editing"].includes(rewrite.status)) {
      return NextResponse.json(
        { error: "Document kan niet gepubliceerd worden in huidige status." },
        { status: 400 }
      );
    }

    const oldStatus = rewrite.status;
    rewrite.status = "published";
    rewrite.statusHistory.push({
      from: oldStatus,
      to: "published",
      changedAt: new Date(),
      changedBy: "user",
      userId: session.user.id as unknown as import("mongoose").Types.ObjectId,
    });

    await rewrite.save();

    return NextResponse.json({ data: rewrite });
  } catch (error) {
    console.error("Rewrite publish error:", error);
    return NextResponse.json(
      { error: "Kon document niet publiceren." },
      { status: 500 }
    );
  }
}

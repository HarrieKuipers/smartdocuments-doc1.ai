import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/db";
import DocumentRewrite from "@/models/DocumentRewrite";

// SSE endpoint for pipeline progress polling
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
    }).lean();

    if (!rewrite) {
      return NextResponse.json(
        { error: "Rewrite niet gevonden." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      data: {
        status: rewrite.status,
        activeVersionNumber: rewrite.activeVersionNumber,
        versionsCount: rewrite.versions.length,
      },
    });
  } catch (error) {
    console.error("Rewrite status GET error:", error);
    return NextResponse.json(
      { error: "Kon status niet ophalen." },
      { status: 500 }
    );
  }
}

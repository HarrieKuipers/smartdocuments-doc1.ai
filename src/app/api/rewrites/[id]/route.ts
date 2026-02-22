import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/db";
import DocumentRewrite from "@/models/DocumentRewrite";

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
    })
      .populate("documentId", "title shortId slug content.originalText")
      .populate("schrijfwijzerId")
      .lean();

    if (!rewrite) {
      return NextResponse.json(
        { error: "Rewrite niet gevonden." },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: rewrite });
  } catch (error) {
    console.error("Rewrite GET error:", error);
    return NextResponse.json(
      { error: "Kon rewrite niet ophalen." },
      { status: 500 }
    );
  }
}

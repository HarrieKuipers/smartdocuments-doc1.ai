import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import DocumentModel from "@/models/Document";
import Organization from "@/models/Organization";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const orgSlug = searchParams.get("orgSlug");
    const docSlug = searchParams.get("docSlug");

    if (!orgSlug || !docSlug) {
      return NextResponse.json({ error: "Missing parameters." }, { status: 400 });
    }

    const org = await Organization.findOne({ slug: orgSlug }).select("_id").lean();
    if (!org) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }

    const doc = await DocumentModel.findOne({
      organizationId: org._id,
      slug: docSlug,
      status: "ready",
    })
      .select("shortId")
      .lean();

    if (!doc) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }

    return NextResponse.json({ shortId: doc.shortId });
  } catch (error) {
    console.error("Reader lookup error:", error);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}

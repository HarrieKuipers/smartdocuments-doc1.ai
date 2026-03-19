import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/db";
import DocumentModel from "@/models/Document";
import Organization from "@/models/Organization";
import { uploadPublicFile } from "@/lib/storage";
import { renderCoverFromDesign } from "@/lib/ai/render-cover-design";
import { nanoid } from "nanoid";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Niet geautoriseerd." }, { status: 401 });
    }

    await connectDB();
    const { id } = await params;

    const doc = await DocumentModel.findOne({
      _id: id,
      organizationId: session.user.organizationId,
    })
      .select("shortId tags organizationId brandOverride")
      .lean();

    if (!doc) {
      return NextResponse.json({ error: "Document niet gevonden." }, { status: 404 });
    }

    const { coverDesign } = await req.json();
    if (!coverDesign || !coverDesign.title || !coverDesign.background) {
      return NextResponse.json({ error: "Ongeldig cover ontwerp." }, { status: 400 });
    }

    // Get org data for rendering
    const org = await Organization.findById(doc.organizationId)
      .select("name logo brandColors")
      .lean();

    const orgName = (org as { name?: string })?.name || "Organisatie";
    const orgLogo = (org as { logo?: string })?.logo;
    const brandPrimary =
      doc.brandOverride?.primary ||
      (org as { brandColors?: { primary?: string } })?.brandColors?.primary ||
      "#0062EB";

    // Render the cover to PNG
    const imageBuffer = await renderCoverFromDesign({
      design: coverDesign,
      orgName,
      orgLogo,
      tags: doc.tags || [],
      brandPrimary,
    });

    // Upload to DO Spaces
    const storageKey = `covers/designed/${doc.shortId}-${nanoid(6)}.png`;
    const coverUrl = await uploadPublicFile(storageKey, imageBuffer, "image/png");

    // Save design config + cover URL
    await DocumentModel.findByIdAndUpdate(id, {
      $set: {
        coverDesign,
        customCoverUrl: coverUrl,
      },
    });

    return NextResponse.json({
      data: { coverDesign, customCoverUrl: coverUrl },
    });
  } catch (error) {
    console.error("Cover design save error:", error);
    return NextResponse.json(
      { error: "Kon voorblad niet opslaan." },
      { status: 500 }
    );
  }
}

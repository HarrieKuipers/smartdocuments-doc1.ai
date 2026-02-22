import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/db";
import DocumentModel from "@/models/Document";
import DocumentRewrite from "@/models/DocumentRewrite";
import Schrijfwijzer from "@/models/Schrijfwijzer";
import { DEFAULT_SELECTED_RULES } from "@/types/rewrite";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Niet geautoriseerd." },
        { status: 401 }
      );
    }

    await connectDB();

    const { documentId, schrijfwijzerId, selectedRules, preset } =
      await req.json();

    if (!documentId) {
      return NextResponse.json(
        { error: "Document ID is verplicht." },
        { status: 400 }
      );
    }

    // Verify document exists and belongs to user's org
    const doc = await DocumentModel.findOne({
      _id: documentId,
      organizationId: session.user.organizationId,
      status: "ready",
    });

    if (!doc) {
      return NextResponse.json(
        { error: "Document niet gevonden of nog niet verwerkt." },
        { status: 404 }
      );
    }

    // Get or find schrijfwijzer
    let swId = schrijfwijzerId;
    if (!swId) {
      const defaultSw = await Schrijfwijzer.findOne({
        organizationId: session.user.organizationId,
        isDefault: true,
      });
      if (!defaultSw) {
        return NextResponse.json(
          { error: "Geen schrijfwijzer gevonden. Maak eerst een schrijfwijzer aan." },
          { status: 400 }
        );
      }
      swId = defaultSw._id;
    }

    // Verify schrijfwijzer exists
    const schrijfwijzer = await Schrijfwijzer.findById(swId);
    if (!schrijfwijzer) {
      return NextResponse.json(
        { error: "Schrijfwijzer niet gevonden." },
        { status: 404 }
      );
    }

    const rules = selectedRules?.length ? selectedRules : DEFAULT_SELECTED_RULES;

    const rewrite = await DocumentRewrite.create({
      documentId: doc._id,
      organizationId: session.user.organizationId,
      schrijfwijzerId: swId,
      selectedRules: rules,
      preset,
      versions: [],
      activeVersionNumber: 0,
      status: "draft",
      statusHistory: [
        {
          from: "draft",
          to: "draft",
          changedAt: new Date(),
          changedBy: "system",
        },
      ],
      createdBy: session.user.id,
    });

    return NextResponse.json({ data: rewrite }, { status: 201 });
  } catch (error) {
    console.error("Rewrites POST error:", error);
    return NextResponse.json(
      { error: "Kon rewrite niet aanmaken." },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Niet geautoriseerd." },
        { status: 401 }
      );
    }

    await connectDB();

    const rewrites = await DocumentRewrite.find({
      organizationId: session.user.organizationId,
    })
      .sort({ createdAt: -1 })
      .populate("documentId", "title shortId slug")
      .lean();

    return NextResponse.json({ data: rewrites });
  } catch (error) {
    console.error("Rewrites GET error:", error);
    return NextResponse.json(
      { error: "Kon rewrites niet ophalen." },
      { status: 500 }
    );
  }
}

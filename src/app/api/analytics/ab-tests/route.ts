import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/db";
import ABTest from "@/models/ABTest";
import DocumentModel from "@/models/Document";
import DocumentEvent from "@/models/DocumentEvent";

// GET — List A/B tests for the organization
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const tests = await ABTest.find({
      organizationId: session.user.organizationId,
    })
      .sort({ createdAt: -1 })
      .populate("documentA", "title shortId")
      .populate("documentB", "title shortId")
      .lean();

    return NextResponse.json({ tests });
  } catch (error) {
    console.error("AB tests list error:", error);
    return NextResponse.json(
      { error: "Failed to fetch A/B tests" },
      { status: 500 }
    );
  }
}

// POST — Create a new A/B test
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const body = await req.json();
    const { name, documentA, documentB, trafficSplit, goalMetric } = body;

    if (!name || !documentA || !documentB) {
      return NextResponse.json(
        { error: "Naam en beide documenten zijn verplicht" },
        { status: 400 }
      );
    }

    // Verify both documents belong to org
    const docs = await DocumentModel.find({
      _id: { $in: [documentA, documentB] },
      organizationId: session.user.organizationId,
    }).lean();

    if (docs.length !== 2) {
      return NextResponse.json(
        { error: "Documenten niet gevonden" },
        { status: 404 }
      );
    }

    const test = await ABTest.create({
      name,
      organizationId: session.user.organizationId,
      documentA,
      documentB,
      trafficSplit: trafficSplit || 50,
      goalMetric: goalMetric || "completionRate",
    });

    return NextResponse.json({ test }, { status: 201 });
  } catch (error) {
    console.error("Create AB test error:", error);
    return NextResponse.json(
      { error: "Failed to create A/B test" },
      { status: 500 }
    );
  }
}

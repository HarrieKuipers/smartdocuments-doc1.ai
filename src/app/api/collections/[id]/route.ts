import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/db";
import Collection from "@/models/Collection";

export async function GET(
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

    const collection = await Collection.findOne({
      _id: id,
      organizationId: session.user.organizationId,
    }).lean();

    if (!collection) {
      return NextResponse.json({ error: "Collectie niet gevonden." }, { status: 404 });
    }

    return NextResponse.json({ data: collection });
  } catch (error) {
    console.error("Collection GET error:", error);
    return NextResponse.json(
      { error: "Kon collectie niet ophalen." },
      { status: 500 }
    );
  }
}

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
    const updates = await req.json();

    // Hash password if setting password access
    if (updates.access?.type === "password" && updates.access.password) {
      updates.access.password = await bcrypt.hash(updates.access.password, 10);
    } else if (updates.access?.type === "password" && !updates.access.password) {
      // Keep existing password if not provided
      const existing = await Collection.findOne({
        _id: id,
        organizationId: session.user.organizationId,
      }).lean();
      if (existing?.access?.password) {
        updates.access.password = existing.access.password;
      }
    }

    const collection = await Collection.findOneAndUpdate(
      { _id: id, organizationId: session.user.organizationId },
      { $set: updates },
      { new: true }
    ).lean();

    if (!collection) {
      return NextResponse.json({ error: "Collectie niet gevonden." }, { status: 404 });
    }

    return NextResponse.json({ data: collection });
  } catch (error) {
    console.error("Collection PUT error:", error);
    return NextResponse.json(
      { error: "Kon collectie niet bijwerken." },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    const collection = await Collection.findOneAndDelete({
      _id: id,
      organizationId: session.user.organizationId,
    });

    if (!collection) {
      return NextResponse.json({ error: "Collectie niet gevonden." }, { status: 404 });
    }

    return NextResponse.json({ message: "Collectie verwijderd." });
  } catch (error) {
    console.error("Collection DELETE error:", error);
    return NextResponse.json(
      { error: "Kon collectie niet verwijderen." },
      { status: 500 }
    );
  }
}

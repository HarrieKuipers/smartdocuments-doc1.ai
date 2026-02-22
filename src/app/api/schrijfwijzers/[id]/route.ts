import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/db";
import Schrijfwijzer from "@/models/Schrijfwijzer";

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

    const schrijfwijzer = await Schrijfwijzer.findOne({
      _id: id,
      organizationId: session.user.organizationId,
    });

    if (!schrijfwijzer) {
      return NextResponse.json(
        { error: "Schrijfwijzer niet gevonden." },
        { status: 404 }
      );
    }

    const { name, description, rules } = await req.json();

    if (name) schrijfwijzer.name = name;
    if (description !== undefined) schrijfwijzer.description = description;
    if (rules) schrijfwijzer.rules = rules;

    await schrijfwijzer.save();

    return NextResponse.json({ data: schrijfwijzer });
  } catch (error) {
    console.error("Schrijfwijzer PUT error:", error);
    return NextResponse.json(
      { error: "Kon schrijfwijzer niet bijwerken." },
      { status: 500 }
    );
  }
}

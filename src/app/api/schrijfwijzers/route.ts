import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/db";
import Schrijfwijzer from "@/models/Schrijfwijzer";
import {
  NLA_SCHRIJFWIJZER_RULES,
  NLA_SCHRIJFWIJZER_NAME,
  NLA_SCHRIJFWIJZER_DESCRIPTION,
} from "@/lib/seed-schrijfwijzer";

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

    const schrijfwijzers = await Schrijfwijzer.find({
      organizationId: session.user.organizationId,
    })
      .sort({ isDefault: -1, createdAt: -1 })
      .lean();

    return NextResponse.json({ data: schrijfwijzers });
  } catch (error) {
    console.error("Schrijfwijzers GET error:", error);
    return NextResponse.json(
      { error: "Kon schrijfwijzers niet ophalen." },
      { status: 500 }
    );
  }
}

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

    const body = await req.json();

    // If seed=true, create the default NLA schrijfwijzer
    if (body.seed === true) {
      const existing = await Schrijfwijzer.findOne({
        organizationId: session.user.organizationId,
        isDefault: true,
      });

      if (existing) {
        return NextResponse.json({ data: existing });
      }

      const schrijfwijzer = await Schrijfwijzer.create({
        organizationId: session.user.organizationId,
        name: NLA_SCHRIJFWIJZER_NAME,
        description: NLA_SCHRIJFWIJZER_DESCRIPTION,
        rules: NLA_SCHRIJFWIJZER_RULES,
        isDefault: true,
      });

      return NextResponse.json({ data: schrijfwijzer }, { status: 201 });
    }

    // Create custom schrijfwijzer
    const { name, description, rules } = body;

    if (!name || !rules?.length) {
      return NextResponse.json(
        { error: "Naam en regels zijn verplicht." },
        { status: 400 }
      );
    }

    const schrijfwijzer = await Schrijfwijzer.create({
      organizationId: session.user.organizationId,
      name,
      description,
      rules,
      isDefault: false,
    });

    return NextResponse.json({ data: schrijfwijzer }, { status: 201 });
  } catch (error) {
    console.error("Schrijfwijzers POST error:", error);
    return NextResponse.json(
      { error: "Kon schrijfwijzer niet aanmaken." },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/db";
import Collection from "@/models/Collection";
import { generateSlug } from "@/lib/slug";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Niet geautoriseerd." }, { status: 401 });
    }

    await connectDB();

    const collections = await Collection.find({
      organizationId: session.user.organizationId,
    })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ data: collections });
  } catch (error) {
    console.error("Collections GET error:", error);
    return NextResponse.json(
      { error: "Kon collecties niet ophalen." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Niet geautoriseerd." }, { status: 401 });
    }

    await connectDB();
    const { name, description } = await req.json();

    if (!name) {
      return NextResponse.json(
        { error: "Naam is verplicht." },
        { status: 400 }
      );
    }

    const collection = await Collection.create({
      name,
      slug: generateSlug(name),
      description,
      organizationId: session.user.organizationId,
    });

    return NextResponse.json({ data: collection }, { status: 201 });
  } catch (error) {
    console.error("Collections POST error:", error);
    return NextResponse.json(
      { error: "Kon collectie niet aanmaken." },
      { status: 500 }
    );
  }
}

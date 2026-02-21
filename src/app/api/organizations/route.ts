import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/db";
import Organization from "@/models/Organization";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Niet geautoriseerd." }, { status: 401 });
    }

    await connectDB();

    const org = await Organization.findById(session.user.organizationId).lean();
    if (!org) {
      return NextResponse.json({ error: "Organisatie niet gevonden." }, { status: 404 });
    }

    return NextResponse.json({ data: org });
  } catch (error) {
    console.error("Organization GET error:", error);
    return NextResponse.json(
      { error: "Kon organisatie niet ophalen." },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import connectDB from "@/lib/db";
import User from "@/models/User";
import Organization from "@/models/Organization";
import { generateSlug } from "@/lib/slug";

export async function POST(req: NextRequest) {
  try {
    const { name, email, password, organizationName } = await req.json();

    if (!name || !email || !password || !organizationName) {
      return NextResponse.json(
        { error: "Alle velden zijn verplicht." },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Wachtwoord moet minimaal 8 tekens bevatten." },
        { status: 400 }
      );
    }

    await connectDB();

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json(
        { error: "Er bestaat al een account met dit e-mailadres." },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const orgSlug = `${generateSlug(organizationName)}-${Date.now().toString(36)}`;

    const org = await Organization.create({
      name: organizationName,
      slug: orgSlug,
      ownerId: "000000000000000000000000", // temp
    });

    const user = await User.create({
      name,
      email,
      passwordHash,
      provider: "credentials",
      organizationId: org._id,
      role: "owner",
    });

    org.ownerId = user._id;
    org.members = [{ userId: user._id, role: "owner", addedAt: new Date() }];
    await org.save();

    return NextResponse.json(
      { message: "Account aangemaakt.", userId: user._id },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Er is een fout opgetreden bij het registreren." },
      { status: 500 }
    );
  }
}

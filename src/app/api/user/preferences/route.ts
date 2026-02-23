import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/db";
import User from "@/models/User";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Niet geautoriseerd." }, { status: 401 });
    }

    await connectDB();
    const user = await User.findById(session.user.id)
      .select("weeklyDigestEnabled")
      .lean();

    return NextResponse.json({
      weeklyDigestEnabled: user?.weeklyDigestEnabled ?? true,
    });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Niet geautoriseerd." }, { status: 401 });
    }

    const body = await req.json();
    await connectDB();

    const update: Record<string, boolean> = {};
    if (typeof body.weeklyDigestEnabled === "boolean") {
      update.weeklyDigestEnabled = body.weeklyDigestEnabled;
    }

    await User.findByIdAndUpdate(session.user.id, update);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

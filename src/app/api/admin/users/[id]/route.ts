import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/admin-auth";
import connectDB from "@/lib/db";
import User from "@/models/User";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireSuperAdmin();
  if (error) return error;

  await connectDB();
  const { id } = await params;
  const user = await User.findById(id)
    .select("-passwordHash -resetToken -resetTokenExpiry")
    .populate("organizationId", "name slug")
    .lean();

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  return NextResponse.json({ data: user });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireSuperAdmin();
  if (error) return error;

  await connectDB();
  const { id } = await params;
  const body = await req.json();

  const allowedFields = ["plan", "role", "isSuperAdmin"];
  const update: Record<string, unknown> = {};
  for (const key of allowedFields) {
    if (body[key] !== undefined) update[key] = body[key];
  }

  const user = await User.findByIdAndUpdate(id, { $set: update }, { new: true })
    .select("-passwordHash -resetToken -resetTokenExpiry")
    .lean();

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  return NextResponse.json({ data: user });
}

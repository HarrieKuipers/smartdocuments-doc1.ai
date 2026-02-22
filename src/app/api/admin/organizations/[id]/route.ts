import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/admin-auth";
import connectDB from "@/lib/db";
import Organization from "@/models/Organization";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireSuperAdmin();
  if (error) return error;

  await connectDB();
  const { id } = await params;
  const org = await Organization.findById(id)
    .populate("ownerId", "name email")
    .populate("members.userId", "name email role")
    .lean();

  if (!org) return NextResponse.json({ error: "Organization not found" }, { status: 404 });

  return NextResponse.json({ data: org });
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

  const allowedFields = ["name", "brandColors"];
  const update: Record<string, unknown> = {};
  for (const key of allowedFields) {
    if (body[key] !== undefined) update[key] = body[key];
  }

  const org = await Organization.findByIdAndUpdate(id, { $set: update }, { new: true }).lean();
  if (!org) return NextResponse.json({ error: "Organization not found" }, { status: 404 });

  return NextResponse.json({ data: org });
}

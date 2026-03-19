import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/admin-auth";
import connectDB from "@/lib/db";
import ApiKey from "@/models/ApiKey";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireSuperAdmin();
  if (error) return error;

  try {
    const { id } = await params;
    const updates = await req.json();
    await connectDB();

    const allowedUpdates: Record<string, unknown> = {};
    if (updates.isActive !== undefined) allowedUpdates.isActive = updates.isActive;

    const key = await ApiKey.findByIdAndUpdate(id, allowedUpdates, { new: true }).lean();
    if (!key) {
      return NextResponse.json({ error: "API key niet gevonden." }, { status: 404 });
    }

    return NextResponse.json({ data: key });
  } catch (error) {
    console.error("Admin api-key update error:", error);
    return NextResponse.json({ error: "Kon API key niet bijwerken." }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireSuperAdmin();
  if (error) return error;

  try {
    const { id } = await params;
    await connectDB();

    const result = await ApiKey.findByIdAndDelete(id);
    if (!result) {
      return NextResponse.json({ error: "API key niet gevonden." }, { status: 404 });
    }

    return NextResponse.json({ message: "API key verwijderd." });
  } catch (error) {
    console.error("Admin api-key delete error:", error);
    return NextResponse.json({ error: "Kon API key niet verwijderen." }, { status: 500 });
  }
}

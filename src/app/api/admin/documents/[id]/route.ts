import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/admin-auth";
import connectDB from "@/lib/db";
import DocumentModel from "@/models/Document";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireSuperAdmin();
  if (error) return error;

  await connectDB();
  const { id } = await params;
  const doc = await DocumentModel.findByIdAndDelete(id);
  if (!doc) return NextResponse.json({ error: "Document not found" }, { status: 404 });

  return NextResponse.json({ success: true });
}

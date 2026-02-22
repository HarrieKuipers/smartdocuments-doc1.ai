import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/admin-auth";
import connectDB from "@/lib/db";
import Template from "@/models/Template";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireSuperAdmin();
  if (error) return error;

  await connectDB();
  const { id } = await params;
  const body = await req.json();

  const allowedFields = [
    "name",
    "primary",
    "primaryDark",
    "primaryLight",
    "logo",
    "headerStyle",
    "showB1Button",
    "showInfoBox",
    "infoBoxLabel",
  ];

  const update: Record<string, unknown> = {};
  for (const key of allowedFields) {
    if (body[key] !== undefined) update[key] = body[key];
  }

  const template = await Template.findOneAndUpdate(
    { templateId: id },
    { $set: update },
    { new: true }
  ).lean();

  if (!template) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  return NextResponse.json({ data: template });
}

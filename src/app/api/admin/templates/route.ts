import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/admin-auth";
import connectDB from "@/lib/db";
import Template from "@/models/Template";
import { TEMPLATES, TEMPLATE_IDS } from "@/lib/templates";

export async function GET() {
  const { error } = await requireSuperAdmin();
  if (error) return error;

  await connectDB();

  // Seed any missing templates from static defaults
  for (const id of TEMPLATE_IDS) {
    const exists = await Template.findOne({ templateId: id });
    if (!exists) {
      await Template.create({ templateId: id, ...TEMPLATES[id] });
    }
  }

  const templates = await Template.find().sort({ templateId: 1 }).lean();
  return NextResponse.json({ data: templates });
}

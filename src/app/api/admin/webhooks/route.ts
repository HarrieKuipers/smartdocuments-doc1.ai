import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/admin-auth";
import connectDB from "@/lib/db";
import Webhook from "@/models/Webhook";
import Organization from "@/models/Organization";

export async function GET() {
  const { error } = await requireSuperAdmin();
  if (error) return error;

  try {
    await connectDB();

    const webhooks = await Webhook.find()
      .sort({ createdAt: -1 })
      .lean();

    const orgIds = [...new Set(webhooks.map((w) => w.organizationId.toString()))];
    const orgs = await Organization.find({ _id: { $in: orgIds } })
      .select("name")
      .lean();
    const orgMap = new Map(orgs.map((o) => [o._id.toString(), o.name]));

    const enriched = webhooks.map((w) => ({
      ...w,
      organizationName: orgMap.get(w.organizationId.toString()) || "Onbekend",
    }));

    return NextResponse.json({ data: enriched });
  } catch (error) {
    console.error("Admin webhooks list error:", error);
    return NextResponse.json({ error: "Kon webhooks niet ophalen." }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/admin-auth";
import connectDB from "@/lib/db";
import Integration from "@/models/Integration";
import Organization from "@/models/Organization";

export async function GET() {
  const { error } = await requireSuperAdmin();
  if (error) return error;

  try {
    await connectDB();

    const integrations = await Integration.find()
      .sort({ createdAt: -1 })
      .lean();

    const orgIds = [...new Set(integrations.map((i) => i.organizationId.toString()))];
    const orgs = await Organization.find({ _id: { $in: orgIds } })
      .select("name")
      .lean();
    const orgMap = new Map(orgs.map((o) => [o._id.toString(), o.name]));

    const enriched = integrations.map((i) => ({
      ...i,
      organizationName: orgMap.get(i.organizationId.toString()) || "Onbekend",
      config: {
        ...i.config,
        notionApiKey: i.config.notionApiKey ? "***" : undefined,
      },
    }));

    return NextResponse.json({ data: enriched });
  } catch (error) {
    console.error("Admin integrations list error:", error);
    return NextResponse.json({ error: "Kon integraties niet ophalen." }, { status: 500 });
  }
}

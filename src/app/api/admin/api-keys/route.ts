import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/admin-auth";
import connectDB from "@/lib/db";
import ApiKey from "@/models/ApiKey";
import Organization from "@/models/Organization";

export async function GET() {
  const { error } = await requireSuperAdmin();
  if (error) return error;

  try {
    await connectDB();

    const keys = await ApiKey.find()
      .sort({ createdAt: -1 })
      .lean();

    // Enrich with org names
    const orgIds = [...new Set(keys.map((k) => k.organizationId.toString()))];
    const orgs = await Organization.find({ _id: { $in: orgIds } })
      .select("name")
      .lean();
    const orgMap = new Map(orgs.map((o) => [o._id.toString(), o.name]));

    const enriched = keys.map((k) => ({
      ...k,
      organizationName: orgMap.get(k.organizationId.toString()) || "Onbekend",
    }));

    return NextResponse.json({ data: enriched });
  } catch (error) {
    console.error("Admin api-keys list error:", error);
    return NextResponse.json({ error: "Kon API keys niet ophalen." }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/admin-auth";
import connectDB from "@/lib/db";
import Organization from "@/models/Organization";
import DocumentModel from "@/models/Document";

export async function GET(req: NextRequest) {
  const { error } = await requireSuperAdmin();
  if (error) return error;

  await connectDB();

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "25");

  const filter: Record<string, unknown> = {};
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { slug: { $regex: search, $options: "i" } },
    ];
  }

  const [orgs, total] = await Promise.all([
    Organization.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("ownerId", "name email plan")
      .lean(),
    Organization.countDocuments(filter),
  ]);

  // Get document counts per org
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orgIds = orgs.map((o: any) => o._id);
  const docCounts = await DocumentModel.aggregate([
    { $match: { organizationId: { $in: orgIds } } },
    { $group: { _id: "$organizationId", count: { $sum: 1 } } },
  ]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const docCountMap = new Map(docCounts.map((d: any) => [d._id.toString(), d.count]));

  return NextResponse.json({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: orgs.map((o: any) => ({
      _id: o._id,
      name: o.name,
      slug: o.slug,
      brandColors: o.brandColors,
      members: o.members?.length || 0,
      documents: docCountMap.get(o._id.toString()) || 0,
      owner: o.ownerId,
      createdAt: o.createdAt,
    })),
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}

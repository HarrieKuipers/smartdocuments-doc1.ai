import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/admin-auth";
import connectDB from "@/lib/db";
import User from "@/models/User";

export async function GET(req: NextRequest) {
  const { error } = await requireSuperAdmin();
  if (error) return error;

  await connectDB();

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";
  const plan = searchParams.get("plan") || "";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "25");

  const filter: Record<string, unknown> = {};
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
    ];
  }
  if (plan) filter.plan = plan;

  const [users, total] = await Promise.all([
    User.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .select("name email plan role documentsUsed createdAt organizationId isSuperAdmin")
      .populate("organizationId", "name")
      .lean(),
    User.countDocuments(filter),
  ]);

  return NextResponse.json({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: users.map((u: any) => ({
      _id: u._id,
      name: u.name,
      email: u.email,
      plan: u.plan,
      role: u.role,
      documentsUsed: u.documentsUsed,
      isSuperAdmin: u.isSuperAdmin,
      createdAt: u.createdAt,
      organization: u.organizationId?.name || "—",
      organizationId: u.organizationId?._id || null,
    })),
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}

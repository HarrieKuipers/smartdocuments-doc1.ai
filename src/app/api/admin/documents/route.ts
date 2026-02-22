import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/admin-auth";
import connectDB from "@/lib/db";
import DocumentModel from "@/models/Document";

export async function GET(req: NextRequest) {
  const { error } = await requireSuperAdmin();
  if (error) return error;

  await connectDB();

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";
  const status = searchParams.get("status") || "";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "25");

  const filter: Record<string, unknown> = {};
  if (search) {
    filter.title = { $regex: search, $options: "i" };
  }
  if (status) filter.status = status;

  const [docs, total] = await Promise.all([
    DocumentModel.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .select("title shortId status analytics organizationId createdAt template")
      .populate("organizationId", "name")
      .lean(),
    DocumentModel.countDocuments(filter),
  ]);

  return NextResponse.json({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: docs.map((d: any) => ({
      _id: d._id,
      title: d.title,
      shortId: d.shortId,
      status: d.status,
      template: d.template,
      views: d.analytics?.totalViews || 0,
      chatInteractions: d.analytics?.chatInteractions || 0,
      organization: d.organizationId?.name || "—",
      createdAt: d.createdAt,
    })),
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}

import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/admin-auth";
import connectDB from "@/lib/db";
import User from "@/models/User";
import Organization from "@/models/Organization";
import DocumentModel from "@/models/Document";

export async function GET() {
  const { error } = await requireSuperAdmin();
  if (error) return error;

  await connectDB();

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    totalUsers,
    newUsersThisMonth,
    totalOrganizations,
    totalDocuments,
    planCounts,
    documentStats,
    recentUsers,
    recentDocuments,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
    Organization.countDocuments(),
    DocumentModel.countDocuments(),
    User.aggregate([
      { $group: { _id: "$plan", count: { $sum: 1 } } },
    ]),
    DocumentModel.aggregate([
      {
        $group: {
          _id: null,
          totalViews: { $sum: "$analytics.totalViews" },
          totalChatInteractions: { $sum: "$analytics.chatInteractions" },
          totalDownloads: { $sum: "$analytics.totalDownloads" },
        },
      },
    ]),
    User.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .select("name email plan role createdAt organizationId")
      .populate("organizationId", "name")
      .lean(),
    DocumentModel.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .select("title status analytics.totalViews organizationId createdAt")
      .populate("organizationId", "name")
      .lean(),
  ]);

  const plans: Record<string, number> = { free: 0, pro: 0, enterprise: 0 };
  planCounts.forEach((p: { _id: string; count: number }) => {
    plans[p._id] = p.count;
  });

  const stats = documentStats[0] || { totalViews: 0, totalChatInteractions: 0, totalDownloads: 0 };

  // Estimate MRR: pro = €49, enterprise = €199
  const mrr = plans.pro * 49 + plans.enterprise * 199;

  return NextResponse.json({
    totalUsers,
    newUsersThisMonth,
    totalOrganizations,
    totalDocuments,
    mrr,
    plans,
    totalViews: stats.totalViews,
    totalChatInteractions: stats.totalChatInteractions,
    totalDownloads: stats.totalDownloads,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recentUsers: recentUsers.map((u: any) => ({
      _id: u._id,
      name: u.name,
      email: u.email,
      plan: u.plan,
      role: u.role,
      createdAt: u.createdAt,
      organization: u.organizationId?.name || "—",
    })),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recentDocuments: recentDocuments.map((d: any) => ({
      _id: d._id,
      title: d.title,
      status: d.status,
      views: d.analytics?.totalViews || 0,
      createdAt: d.createdAt,
      organization: d.organizationId?.name || "—",
    })),
  });
}

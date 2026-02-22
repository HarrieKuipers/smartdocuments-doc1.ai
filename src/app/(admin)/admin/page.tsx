"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  Building2,
  FileText,
  DollarSign,
  Eye,
  MessageSquare,
} from "lucide-react";

interface Stats {
  totalUsers: number;
  newUsersThisMonth: number;
  totalOrganizations: number;
  totalDocuments: number;
  mrr: number;
  plans: { free: number; pro: number; enterprise: number };
  totalViews: number;
  totalChatInteractions: number;
  recentUsers: {
    _id: string;
    name: string;
    email: string;
    plan: string;
    role: string;
    createdAt: string;
    organization: string;
  }[];
  recentDocuments: {
    _id: string;
    title: string;
    status: string;
    views: number;
    createdAt: string;
    organization: string;
  }[];
}

const planColors: Record<string, string> = {
  free: "bg-gray-100 text-gray-700",
  pro: "bg-blue-100 text-blue-700",
  enterprise: "bg-purple-100 text-purple-700",
};

const statusColors: Record<string, string> = {
  ready: "bg-green-100 text-green-700",
  processing: "bg-blue-100 text-blue-700",
  error: "bg-red-100 text-red-700",
  uploading: "bg-yellow-100 text-yellow-700",
};

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-96 rounded-2xl" />
          <Skeleton className="h-96 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!stats) return <p>Failed to load stats.</p>;

  const kpis = [
    { label: "Total Users", value: stats.totalUsers, sub: `+${stats.newUsersThisMonth} this month`, icon: Users },
    { label: "Organizations", value: stats.totalOrganizations, icon: Building2 },
    { label: "Documents", value: stats.totalDocuments, icon: FileText },
    { label: "MRR", value: `€${stats.mrr.toLocaleString()}`, icon: DollarSign },
    { label: "Total Views", value: stats.totalViews.toLocaleString(), icon: Eye },
    { label: "AI Interactions", value: stats.totalChatInteractions.toLocaleString(), icon: MessageSquare },
  ];

  const totalPlanUsers = stats.plans.free + stats.plans.pro + stats.plans.enterprise;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Overview</h1>
        <p className="text-sm text-gray-500">Platform-wide metrics and activity</p>
      </div>

      {/* KPI Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="rounded-2xl border-gray-100">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium uppercase tracking-wider text-gray-400">
                  {kpi.label}
                </span>
                <kpi.icon className="h-4 w-4 text-gray-300" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{kpi.value}</p>
              {kpi.sub && (
                <p className="mt-1 text-xs text-green-600">{kpi.sub}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Plan Distribution */}
      <Card className="rounded-2xl border-gray-100">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Plan Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-1 h-3 rounded-full overflow-hidden bg-gray-100">
            {totalPlanUsers > 0 && (
              <>
                <div
                  className="bg-gray-400 rounded-l-full"
                  style={{ width: `${(stats.plans.free / totalPlanUsers) * 100}%` }}
                />
                <div
                  className="bg-[#0062EB]"
                  style={{ width: `${(stats.plans.pro / totalPlanUsers) * 100}%` }}
                />
                <div
                  className="bg-purple-500 rounded-r-full"
                  style={{ width: `${(stats.plans.enterprise / totalPlanUsers) * 100}%` }}
                />
              </>
            )}
          </div>
          <div className="mt-3 flex gap-6 text-sm">
            <span className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-gray-400" />
              Free: {stats.plans.free}
            </span>
            <span className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-[#0062EB]" />
              Pro: {stats.plans.pro}
            </span>
            <span className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-purple-500" />
              Enterprise: {stats.plans.enterprise}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Users */}
        <Card className="rounded-2xl border-gray-100">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Recent Signups</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.recentUsers.map((u) => (
                <div
                  key={u._id}
                  className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{u.name}</p>
                    <p className="text-xs text-gray-500 truncate">{u.email}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    <Badge className={planColors[u.plan] || planColors.free}>
                      {u.plan}
                    </Badge>
                    <span className="text-xs text-gray-400">
                      {new Date(u.createdAt).toLocaleDateString("nl-NL")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Documents */}
        <Card className="rounded-2xl border-gray-100">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Recent Documents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.recentDocuments.map((d) => (
                <div
                  key={d._id}
                  className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{d.title}</p>
                    <p className="text-xs text-gray-500 truncate">{d.organization}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    <Badge className={statusColors[d.status] || "bg-gray-100 text-gray-700"}>
                      {d.status}
                    </Badge>
                    <span className="text-xs text-gray-400">
                      {d.views} views
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

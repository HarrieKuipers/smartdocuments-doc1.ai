"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { DollarSign, TrendingUp, Users, AlertTriangle } from "lucide-react";

interface RevenueData {
  mrr: number;
  plans: { free: number; pro: number; enterprise: number };
  revenueBreakdown: {
    pro: { count: number; revenue: number };
    enterprise: { count: number; revenue: number };
  };
  recentCharges: {
    id: string;
    amount: number;
    currency: string;
    status: string;
    created: number;
    email: string | null;
  }[];
  cancelledSubs: {
    id: string;
    canceledAt: number;
    email: string | null;
  }[];
}

export default function AdminRevenuePage() {
  const [data, setData] = useState<RevenueData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/revenue")
      .then((r) => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    );
  }

  if (!data) return <p>Failed to load revenue data.</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Revenue</h1>
        <p className="text-sm text-gray-500">Stripe revenue and subscription metrics</p>
      </div>

      {/* MRR + Plan Revenue Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="rounded-2xl border-gray-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium uppercase tracking-wider text-gray-400">MRR</span>
              <DollarSign className="h-4 w-4 text-gray-300" />
            </div>
            <p className="text-3xl font-bold text-gray-900">€{data.mrr.toLocaleString()}</p>
            <p className="mt-1 text-xs text-gray-500">Monthly Recurring Revenue</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-gray-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium uppercase tracking-wider text-gray-400">Pro</span>
              <TrendingUp className="h-4 w-4 text-gray-300" />
            </div>
            <p className="text-3xl font-bold text-gray-900">
              €{data.revenueBreakdown.pro.revenue.toLocaleString()}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              {data.revenueBreakdown.pro.count} subscribers × €49/mo
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-gray-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium uppercase tracking-wider text-gray-400">Enterprise</span>
              <Users className="h-4 w-4 text-gray-300" />
            </div>
            <p className="text-3xl font-bold text-gray-900">
              €{data.revenueBreakdown.enterprise.revenue.toLocaleString()}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              {data.revenueBreakdown.enterprise.count} subscribers × €199/mo
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Charges */}
        <Card className="rounded-2xl border-gray-100">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            {data.recentCharges.length > 0 ? (
              <div className="space-y-3">
                {data.recentCharges.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        €{c.amount.toFixed(2)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {c.email || c.id.slice(0, 20)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={c.status === "succeeded" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}>
                        {c.status}
                      </Badge>
                      <span className="text-xs text-gray-400">
                        {new Date(c.created * 1000).toLocaleDateString("nl-NL")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 py-8 text-center">
                No charges recorded yet.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Cancelled Subscriptions */}
        <Card className="rounded-2xl border-gray-100">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              Churn
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.cancelledSubs.length > 0 ? (
              <div className="space-y-3">
                {data.cancelledSubs.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3"
                  >
                    <p className="text-sm text-gray-700">{s.id.slice(0, 25)}...</p>
                    <span className="text-xs text-gray-400">
                      {s.canceledAt ? new Date(s.canceledAt * 1000).toLocaleDateString("nl-NL") : "—"}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 py-8 text-center">
                No cancellations. Nice!
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

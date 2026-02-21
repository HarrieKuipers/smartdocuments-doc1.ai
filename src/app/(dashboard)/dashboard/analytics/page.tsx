"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Eye, Clock, Download, BarChart3, MessageSquare } from "lucide-react";

interface AnalyticsData {
  totalViews: number;
  averageReadTime: number;
  totalDownloads: number;
  chatInteractions: number;
  topDocuments: {
    title: string;
    views: number;
  }[];
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const res = await fetch("/api/documents?limit=100");
        if (res.ok) {
          const result = await res.json();
          const docs = result.data || [];

          const analytics: AnalyticsData = {
            totalViews: docs.reduce(
              (acc: number, d: { analytics?: { totalViews?: number } }) =>
                acc + (d.analytics?.totalViews || 0),
              0
            ),
            averageReadTime: 0,
            totalDownloads: docs.reduce(
              (acc: number, d: { analytics?: { totalDownloads?: number } }) =>
                acc + (d.analytics?.totalDownloads || 0),
              0
            ),
            chatInteractions: docs.reduce(
              (acc: number, d: { analytics?: { chatInteractions?: number } }) =>
                acc + (d.analytics?.chatInteractions || 0),
              0
            ),
            topDocuments: docs
              .sort(
                (a: { analytics?: { totalViews?: number } }, b: { analytics?: { totalViews?: number } }) =>
                  (b.analytics?.totalViews || 0) - (a.analytics?.totalViews || 0)
              )
              .slice(0, 5)
              .map((d: { title: string; analytics?: { totalViews?: number } }) => ({
                title: d.title,
                views: d.analytics?.totalViews || 0,
              })),
          };
          setData(analytics);
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    }
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="text-muted-foreground">
          Inzicht in het gebruik van je documenten
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Totaal Views
            </CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{data?.totalViews || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Gem. Leestijd
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {data?.averageReadTime || 0}s
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Totaal Downloads
            </CardTitle>
            <Download className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{data?.totalDownloads || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              AI Interacties
            </CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {data?.chatInteractions || 0}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Top Documents */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Top Documenten
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data?.topDocuments?.length ? (
            <div className="space-y-3">
              {data.topDocuments.map((doc, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-lg bg-gray-50 p-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#0062EB]/10 text-xs font-medium text-[#0062EB]">
                      {i + 1}
                    </span>
                    <span className="text-sm font-medium">{doc.title}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {doc.views} views
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Nog geen data beschikbaar.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

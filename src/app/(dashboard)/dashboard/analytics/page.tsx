"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Eye, Users, Clock, MessageSquare, Download } from "lucide-react";
import KPICard from "@/components/analytics/cards/KPICard";
import PeriodSelector from "@/components/analytics/filters/PeriodSelector";
import TimeSeriesChart from "@/components/analytics/charts/TimeSeriesChart";
import DonutChart from "@/components/analytics/charts/DonutChart";
import DocumentsTable from "@/components/analytics/tables/DocumentsTable";
import { CHART_COLORS, type Period } from "@/lib/analytics/constants";
import { formatDuration } from "@/lib/analytics/helpers";

interface OverviewData {
  overview: {
    totalViews: number;
    viewsTrend: number;
    uniqueVisitors: number;
    visitorsTrend: number;
    avgReadTime: number;
    readTimeTrend: number;
    totalChatMessages: number;
    chatTrend: number;
    totalDownloads: number;
    downloadsTrend: number;
  };
  timeseries: { date: string; views: number; uniqueVisitors: number }[];
  topDocuments: {
    documentId: string;
    title: string;
    shortId: string;
    views: number;
    uniqueVisitors: number;
  }[];
  deviceBreakdown: { desktop: number; mobile: number; tablet: number };
  documents: {
    _id: string;
    title: string;
    shortId: string;
    views: number;
    uniqueVisitors: number;
    downloads: number;
    chatMessages: number;
    avgReadTime: number;
  }[];
}

export default function AnalyticsPage() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>("30d");

  const fetchAnalytics = useCallback(async (p: Period) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/analytics/overview?period=${p}`);
      if (res.ok) {
        const result = await res.json();
        setData(result);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics(period);
  }, [period, fetchAnalytics]);

  function handlePeriodChange(p: Period) {
    setPeriod(p);
  }

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-64" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-80" />
      </div>
    );
  }

  const overview = data?.overview;
  const deviceData = data?.deviceBreakdown
    ? [
        {
          name: "Desktop",
          value: data.deviceBreakdown.desktop,
          color: CHART_COLORS.devices.desktop,
        },
        {
          name: "Mobile",
          value: data.deviceBreakdown.mobile,
          color: CHART_COLORS.devices.mobile,
        },
        {
          name: "Tablet",
          value: data.deviceBreakdown.tablet,
          color: CHART_COLORS.devices.tablet,
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-sm text-muted-foreground">
            Inzicht in het gebruik van je documenten
          </p>
        </div>
        <PeriodSelector value={period} onChange={handlePeriodChange} />
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <KPICard
          title="Views"
          value={overview?.totalViews || 0}
          trend={overview?.viewsTrend}
          icon={Eye}
          subtitle="vs vorige periode"
        />
        <KPICard
          title="Unieke Bezoekers"
          value={overview?.uniqueVisitors || 0}
          trend={overview?.visitorsTrend}
          icon={Users}
          subtitle="vs vorige periode"
        />
        <KPICard
          title="Gem. Leestijd"
          value={formatDuration(overview?.avgReadTime || 0)}
          trend={overview?.readTimeTrend}
          icon={Clock}
          subtitle="vs vorige periode"
        />
        <KPICard
          title="AI Chat Vragen"
          value={overview?.totalChatMessages || 0}
          trend={overview?.chatTrend}
          icon={MessageSquare}
          subtitle="vs vorige periode"
        />
        <KPICard
          title="Downloads"
          value={overview?.totalDownloads || 0}
          trend={overview?.downloadsTrend}
          icon={Download}
          subtitle="vs vorige periode"
        />
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Views Over Time */}
        <Card className="border-0 shadow-sm lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              Views & Bezoekers Over Tijd
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data?.timeseries && data.timeseries.length > 0 ? (
              <TimeSeriesChart
                data={data.timeseries}
                series={[
                  { key: "views", label: "Views", color: CHART_COLORS.primary },
                  {
                    key: "uniqueVisitors",
                    label: "Unieke Bezoekers",
                    color: CHART_COLORS.secondary,
                  },
                ]}
                height={300}
              />
            ) : (
              <div className="flex h-[300px] items-center justify-center text-sm text-gray-400">
                Nog geen data beschikbaar
              </div>
            )}
          </CardContent>
        </Card>

        {/* Device Breakdown */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              Apparaten
            </CardTitle>
          </CardHeader>
          <CardContent>
            {deviceData.some((d) => d.value > 0) ? (
              <DonutChart data={deviceData} height={180} />
            ) : (
              <div className="flex h-[180px] items-center justify-center text-sm text-gray-400">
                Nog geen data beschikbaar
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Documents Table */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            Documenten
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DocumentsTable documents={data?.documents || []} />
        </CardContent>
      </Card>
    </div>
  );
}

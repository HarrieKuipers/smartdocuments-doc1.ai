"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Eye, Users, Clock, MessageSquare, Download, GitCompareArrows, FlaskConical } from "lucide-react";
import KPICard from "@/components/analytics/cards/KPICard";
import PeriodSelector from "@/components/analytics/filters/PeriodSelector";
import DateRangePicker from "@/components/analytics/filters/DateRangePicker";
import TimeSeriesChart from "@/components/analytics/charts/TimeSeriesChart";
import DonutChart from "@/components/analytics/charts/DonutChart";
import DocumentsTable from "@/components/analytics/tables/DocumentsTable";
import GranularityToggle, { type Granularity } from "@/components/analytics/filters/GranularityToggle";
import { CHART_COLORS, type Period } from "@/lib/analytics/constants";
import { formatDuration } from "@/lib/analytics/helpers";

function groupTimeseries(
  data: { date: string; views: number; uniqueVisitors: number }[],
  granularity: Granularity
) {
  if (granularity === "day" || granularity === "hour") return data;

  const grouped = new Map<string, { views: number; uniqueVisitors: number }>();

  for (const d of data) {
    const date = new Date(d.date);
    let key: string;
    if (granularity === "week") {
      const day = date.getDay();
      const monday = new Date(date);
      monday.setDate(date.getDate() - ((day + 6) % 7));
      key = monday.toISOString().split("T")[0];
    } else {
      key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`;
    }
    const existing = grouped.get(key) || { views: 0, uniqueVisitors: 0 };
    existing.views += d.views;
    existing.uniqueVisitors += d.uniqueVisitors;
    grouped.set(key, existing);
  }

  return Array.from(grouped.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, vals]) => ({ date, ...vals }));
}

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
  const router = useRouter();
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>("30d");
  const [customRange, setCustomRange] = useState<{
    start: string;
    end: string;
  } | null>(null);
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  const [granularity, setGranularity] = useState<Granularity>("day");

  const periodParam = customRange
    ? `period=custom&startDate=${customRange.start}&endDate=${customRange.end}`
    : `period=${period}`;

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/analytics/overview?${periodParam}`);
      if (res.ok) {
        const result = await res.json();
        setData(result);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [periodParam]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  function handlePeriodChange(p: Period) {
    setPeriod(p);
    setCustomRange(null);
  }

  function handleCustomRange(start: string, end: string) {
    setCustomRange({ start, end });
    setPeriod("30d");
  }

  function toggleDocSelect(docId: string) {
    setSelectedDocs((prev) =>
      prev.includes(docId)
        ? prev.filter((id) => id !== docId)
        : prev.length < 5
          ? [...prev, docId]
          : prev
    );
  }

  function handleCompare() {
    if (selectedDocs.length >= 2) {
      router.push(
        `/dashboard/analytics/compare?documents=${selectedDocs.join(",")}`
      );
    }
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
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold">Analytics</h1>
            <p className="text-sm text-muted-foreground">
              Inzicht in het gebruik van je documenten
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/dashboard/analytics/ab-tests")}
          >
            <FlaskConical className="mr-2 h-4 w-4" />
            A/B Tests
          </Button>
          <DateRangePicker
            startDate={customRange?.start}
            endDate={customRange?.end}
            onChange={handleCustomRange}
          />
          <PeriodSelector value={period} onChange={handlePeriodChange} />
        </div>
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
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">
                Views & Bezoekers Over Tijd
              </CardTitle>
              <GranularityToggle value={granularity} onChange={setGranularity} />
            </div>
          </CardHeader>
          <CardContent>
            {data?.timeseries && data.timeseries.length > 0 ? (
              <TimeSeriesChart
                data={groupTimeseries(data.timeseries, granularity)}
                series={[
                  {
                    key: "views",
                    label: "Views",
                    color: CHART_COLORS.primary,
                  },
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

      {/* Documents Table with Compare */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">
              Documenten
            </CardTitle>
            {selectedDocs.length >= 2 && (
              <Button size="sm" variant="outline" onClick={handleCompare}>
                <GitCompareArrows className="mr-2 h-4 w-4" />
                Vergelijk ({selectedDocs.length})
              </Button>
            )}
          </div>
          {data?.documents && data.documents.length > 1 && (
            <p className="text-xs text-gray-400">
              Selecteer 2-5 documenten om te vergelijken
            </p>
          )}
        </CardHeader>
        <CardContent>
          <DocumentsTable
            documents={data?.documents || []}
            selectable
            selectedIds={selectedDocs}
            onToggleSelect={toggleDocSelect}
          />
        </CardContent>
      </Card>
    </div>
  );
}

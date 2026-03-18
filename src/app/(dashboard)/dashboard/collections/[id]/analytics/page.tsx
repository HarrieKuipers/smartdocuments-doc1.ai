"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Eye,
  Users,
  MousePointerClick,
  Search,
  MessageSquare,
} from "lucide-react";
import KPICard from "@/components/analytics/cards/KPICard";
import PeriodSelector from "@/components/analytics/filters/PeriodSelector";
import TimeSeriesChart from "@/components/analytics/charts/TimeSeriesChart";
import DonutChart from "@/components/analytics/charts/DonutChart";
import HorizontalBarChart from "@/components/analytics/charts/HorizontalBarChart";
import { CHART_COLORS, type Period } from "@/lib/analytics/constants";

interface AnalyticsData {
  collection: { name: string; slug: string };
  stats: {
    pageViews: number;
    pageViewsTrend: number;
    uniqueVisitors: number;
    uniqueVisitorsTrend: number;
    documentClicks: number;
    documentClicksTrend: number;
    searches: number;
    chatMessages: number;
    chatMessagesTrend: number;
    chatSuggestionClicks: number;
  };
  timeseries: { date: string; views: number; visitors: number }[];
  topDocuments: { title: string; shortId: string; clicks: number }[];
  topSearches: { query: string; count: number }[];
  topReferrers: { referrer: string; count: number }[];
  deviceBreakdown: { desktop: number; mobile: number; tablet: number };
}

export default function CollectionAnalyticsPage() {
  const params = useParams();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>("30d");

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/analytics/collections/${params.id}?period=${period}`
        );
        if (res.ok) {
          const json = await res.json();
          setData(json.data);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [params.id, period]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-72" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Kon analytics niet laden.
      </div>
    );
  }

  const deviceData = [
    { name: "Desktop", value: data.deviceBreakdown.desktop, color: CHART_COLORS.primary },
    { name: "Mobiel", value: data.deviceBreakdown.mobile, color: CHART_COLORS.secondary },
    { name: "Tablet", value: data.deviceBreakdown.tablet, color: CHART_COLORS.success },
  ].filter((d) => d.value > 0);

  const topDocsData = data.topDocuments.map((d) => ({
    name: d.title.length > 35 ? d.title.slice(0, 35) + "…" : d.title,
    value: d.clicks,
  }));

  const topSearchData = data.topSearches.map((s) => ({
    name: s.query,
    value: s.count,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/dashboard/collections/${params.id}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-1 h-4 w-4" />
              Terug
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Analytics</h1>
            <p className="text-sm text-muted-foreground">
              {data.collection.name}
            </p>
          </div>
        </div>
        <PeriodSelector value={period} onChange={setPeriod} />
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <KPICard
          title="Paginaweergaven"
          value={data.stats.pageViews.toLocaleString("nl-NL")}
          trend={data.stats.pageViewsTrend}
          icon={Eye}
        />
        <KPICard
          title="Unieke bezoekers"
          value={data.stats.uniqueVisitors.toLocaleString("nl-NL")}
          trend={data.stats.uniqueVisitorsTrend}
          icon={Users}
        />
        <KPICard
          title="Document kliks"
          value={data.stats.documentClicks.toLocaleString("nl-NL")}
          trend={data.stats.documentClicksTrend}
          icon={MousePointerClick}
        />
        <KPICard
          title="Zoekopdrachten"
          value={data.stats.searches.toLocaleString("nl-NL")}
          icon={Search}
        />
        <KPICard
          title="Chat berichten"
          value={data.stats.chatMessages.toLocaleString("nl-NL")}
          trend={data.stats.chatMessagesTrend}
          icon={MessageSquare}
          subtitle={
            data.stats.chatSuggestionClicks > 0
              ? `${data.stats.chatSuggestionClicks} suggestie-kliks`
              : undefined
          }
        />
      </div>

      {/* Timeseries */}
      {data.timeseries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Bezoekers over tijd</CardTitle>
          </CardHeader>
          <CardContent>
            <TimeSeriesChart
              data={data.timeseries.map((d) => ({
                date: d.date,
                views: d.views,
                uniqueVisitors: d.visitors,
              }))}
              series={[
                { key: "views", label: "Weergaven", color: CHART_COLORS.primary },
                { key: "uniqueVisitors", label: "Bezoekers", color: CHART_COLORS.secondary },
              ]}
              height={280}
            />
          </CardContent>
        </Card>
      )}

      {/* Bottom row: documents, searches, devices */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Top Documents */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Meest bekeken documenten</CardTitle>
          </CardHeader>
          <CardContent>
            {topDocsData.length > 0 ? (
              <HorizontalBarChart
                data={topDocsData}
                color={CHART_COLORS.primary}
              />
            ) : (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Nog geen data
              </p>
            )}
          </CardContent>
        </Card>

        {/* Top Searches */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Zoekopdrachten</CardTitle>
          </CardHeader>
          <CardContent>
            {topSearchData.length > 0 ? (
              <HorizontalBarChart
                data={topSearchData}
                color={CHART_COLORS.warning}
              />
            ) : (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Nog geen data
              </p>
            )}
          </CardContent>
        </Card>

        {/* Device Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Apparaten</CardTitle>
          </CardHeader>
          <CardContent>
            {deviceData.length > 0 ? (
              <DonutChart data={deviceData} />
            ) : (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Nog geen data
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  Eye,
  Users,
  Clock,
  MessageSquare,
  Download,
  Share2,
  MousePointerClick,
  Target,
  FileDown,
} from "lucide-react";
import KPICard from "@/components/analytics/cards/KPICard";
import PeriodSelector from "@/components/analytics/filters/PeriodSelector";
import TimeSeriesChart from "@/components/analytics/charts/TimeSeriesChart";
import DonutChart from "@/components/analytics/charts/DonutChart";
import HorizontalBarChart from "@/components/analytics/charts/HorizontalBarChart";
import ScrollHeatmap from "@/components/analytics/charts/ScrollHeatmap";
import HeatmapGrid from "@/components/analytics/charts/HeatmapGrid";
import QuestionsTable from "@/components/analytics/tables/QuestionsTable";
import TermsTable from "@/components/analytics/tables/TermsTable";
import { CHART_COLORS, type Period } from "@/lib/analytics/constants";
import { formatDuration } from "@/lib/analytics/helpers";

interface DocumentAnalytics {
  document: { _id: string; title: string; shortId: string; createdAt: string };
  overview: {
    totalViews: number;
    viewsTrend: number;
    uniqueVisitors: number;
    visitorsTrend: number;
    avgReadTime: number;
    readTimeTrend: number;
    totalDownloads: number;
    totalShares: number;
    totalChatMessages: number;
    chatTrend: number;
    totalTermClicks: number;
    avgScrollDepth: number;
    completionRate: number;
  };
  timeseries: { date: string; views: number; uniqueVisitors: number }[];
  deviceBreakdown: { desktop: number; mobile: number; tablet: number };
  topReferrers: { referrer: string; count: number }[];
  topCountries: { country: string; count: number }[];
}

interface QuestionsData {
  questions: {
    _id: string;
    question: string;
    category?: string;
    feedback?: { type: "positive" | "negative" | null };
    timestamp: string;
  }[];
  categories: { category: string; count: number }[];
  feedback: { total: number; positive: number; negative: number };
  chatStats: {
    totalMessages: number;
    totalSessions: number;
    avgPerSession: number;
  };
}

interface TermsData {
  terms: { term: string; clicks: number; trend: number }[];
}

interface VisitorsData {
  deviceBreakdown: { desktop: number; mobile: number; tablet: number };
  referrers: { referrer: string; count: number }[];
  countries: { country: string; count: number }[];
  peakHours: { dayOfWeek: number; hour: number; count: number }[];
}

interface HeatmapData {
  scrollDepth: {
    percentage: number;
    count: number;
    uniqueVisitors: number;
  }[];
  sectionViews: {
    sectionId: string;
    title: string;
    views: number;
    uniqueVisitors: number;
  }[];
  totalSessions: number;
}

export default function DocumentAnalyticsPage() {
  const params = useParams();
  const router = useRouter();
  const documentId = params.documentId as string;

  const [period, setPeriod] = useState<Period>("30d");
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DocumentAnalytics | null>(null);

  // Tab data (lazy loaded)
  const [questionsData, setQuestionsData] = useState<QuestionsData | null>(null);
  const [termsData, setTermsData] = useState<TermsData | null>(null);
  const [visitorsData, setVisitorsData] = useState<VisitorsData | null>(null);
  const [heatmapData, setHeatmapData] = useState<HeatmapData | null>(null);
  const [activeTab, setActiveTab] = useState("overzicht");

  const fetchMain = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/analytics/documents/${documentId}?period=${period}`
      );
      if (res.ok) {
        setData(await res.json());
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [documentId, period]);

  useEffect(() => {
    fetchMain();
  }, [fetchMain]);

  // Lazy load tab data
  useEffect(() => {
    if (activeTab === "chat" && !questionsData) {
      fetch(
        `/api/analytics/documents/${documentId}/questions?period=${period}`
      )
        .then((r) => r.json())
        .then(setQuestionsData)
        .catch(() => {});
    }
    if (activeTab === "begrippen" && !termsData) {
      fetch(
        `/api/analytics/documents/${documentId}/terms?period=${period}`
      )
        .then((r) => r.json())
        .then(setTermsData)
        .catch(() => {});
    }
    if (activeTab === "bezoekers" && !visitorsData) {
      fetch(
        `/api/analytics/documents/${documentId}/visitors?period=${period}`
      )
        .then((r) => r.json())
        .then(setVisitorsData)
        .catch(() => {});
    }
    if (activeTab === "secties" && !heatmapData) {
      fetch(
        `/api/analytics/documents/${documentId}/heatmap?period=${period}`
      )
        .then((r) => r.json())
        .then(setHeatmapData)
        .catch(() => {});
    }
  }, [activeTab, documentId, period, questionsData, termsData, visitorsData, heatmapData]);

  // Reset tab data when period changes
  useEffect(() => {
    setQuestionsData(null);
    setTermsData(null);
    setVisitorsData(null);
    setHeatmapData(null);
  }, [period]);

  function handleExport() {
    window.open(
      `/api/analytics/documents/${documentId}/export?format=csv&period=${period}`,
      "_blank"
    );
  }

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
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
        { name: "Desktop", value: data.deviceBreakdown.desktop, color: CHART_COLORS.devices.desktop },
        { name: "Mobile", value: data.deviceBreakdown.mobile, color: CHART_COLORS.devices.mobile },
        { name: "Tablet", value: data.deviceBreakdown.tablet, color: CHART_COLORS.devices.tablet },
      ]
    : [];

  const categoryData = questionsData?.categories?.map((c) => ({
    name: c.category || "Overig",
    value: c.count,
  })) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/dashboard/analytics")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              {data?.document?.title || "Document Analytics"}
            </h1>
            {data?.document?.createdAt && (
              <p className="text-sm text-muted-foreground">
                Geupload:{" "}
                {new Date(data.document.createdAt).toLocaleDateString("nl-NL")}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={handleExport}>
            <FileDown className="mr-2 h-4 w-4" />
            Exporteer CSV
          </Button>
          <PeriodSelector value={period} onChange={setPeriod} />
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full justify-start">
          <TabsTrigger value="overzicht">Overzicht</TabsTrigger>
          <TabsTrigger value="secties">Secties</TabsTrigger>
          <TabsTrigger value="chat">AI Chat</TabsTrigger>
          <TabsTrigger value="begrippen">Begrippen</TabsTrigger>
          <TabsTrigger value="bezoekers">Bezoekers</TabsTrigger>
        </TabsList>

        {/* TAB: OVERZICHT */}
        <TabsContent value="overzicht" className="space-y-6">
          {/* KPI Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <KPICard
              title="Views"
              value={overview?.totalViews || 0}
              trend={overview?.viewsTrend}
              icon={Eye}
            />
            <KPICard
              title="Unieke Bezoekers"
              value={overview?.uniqueVisitors || 0}
              trend={overview?.visitorsTrend}
              icon={Users}
            />
            <KPICard
              title="Gem. Leestijd"
              value={formatDuration(overview?.avgReadTime || 0)}
              trend={overview?.readTimeTrend}
              icon={Clock}
            />
            <KPICard
              title="AI Chat Vragen"
              value={overview?.totalChatMessages || 0}
              trend={overview?.chatTrend}
              icon={MessageSquare}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <KPICard
              title="Downloads"
              value={overview?.totalDownloads || 0}
              icon={Download}
            />
            <KPICard
              title="Gedeeld"
              value={overview?.totalShares || 0}
              icon={Share2}
            />
            <KPICard
              title="Term Kliks"
              value={overview?.totalTermClicks || 0}
              icon={MousePointerClick}
            />
            <KPICard
              title="Scroll Completie"
              value={`${overview?.completionRate || 0}%`}
              icon={Target}
            />
          </div>

          {/* Chart */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-semibold">
                Engagement Over Tijd
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

          {/* Device + Referrers */}
          <div className="grid gap-6 lg:grid-cols-2">
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
                  <p className="text-sm text-gray-400">Geen data</p>
                )}
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-semibold">
                  Referrers
                </CardTitle>
              </CardHeader>
              <CardContent>
                {data?.topReferrers && data.topReferrers.length > 0 ? (
                  <HorizontalBarChart
                    data={data.topReferrers.map((r) => ({
                      name: r.referrer || "Direct",
                      value: r.count,
                    }))}
                  />
                ) : (
                  <p className="text-sm text-gray-400">Geen data</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TAB: SECTIES */}
        <TabsContent value="secties" className="space-y-6">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-semibold">
                Scroll Heatmap
              </CardTitle>
            </CardHeader>
            <CardContent>
              {heatmapData?.sectionViews && heatmapData.sectionViews.length > 0 ? (
                <ScrollHeatmap
                  sections={heatmapData.sectionViews}
                  totalSessions={heatmapData.totalSessions}
                />
              ) : (
                <p className="text-sm text-gray-400">
                  Nog geen sectie data beschikbaar. Sectie tracking wordt actief zodra bezoekers het document bekijken.
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-semibold">
                Scroll Diepte
              </CardTitle>
            </CardHeader>
            <CardContent>
              {heatmapData?.scrollDepth && heatmapData.scrollDepth.length > 0 ? (
                <div className="space-y-3">
                  {heatmapData.scrollDepth.map((s) => (
                    <div key={s.percentage} className="flex items-center gap-3">
                      <span className="w-12 text-sm font-medium text-gray-600">
                        {s.percentage}%
                      </span>
                      <div className="flex-1">
                        <div className="h-5 w-full overflow-hidden rounded-full bg-gray-100">
                          <div
                            className="h-full rounded-full bg-blue-500 transition-all"
                            style={{
                              width: `${heatmapData.totalSessions > 0 ? Math.round((s.uniqueVisitors / heatmapData.totalSessions) * 100) : 0}%`,
                            }}
                          />
                        </div>
                      </div>
                      <span className="w-16 text-right text-xs text-gray-400">
                        {s.uniqueVisitors} bezoekers
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400">Nog geen scroll data</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB: AI CHAT */}
        <TabsContent value="chat" className="space-y-6">
          {/* Chat KPIs */}
          <div className="grid gap-4 md:grid-cols-4">
            <KPICard
              title="Totaal Vragen"
              value={questionsData?.chatStats?.totalMessages || 0}
              icon={MessageSquare}
            />
            <KPICard
              title="Chat Sessies"
              value={questionsData?.chatStats?.totalSessions || 0}
              icon={Users}
            />
            <KPICard
              title="Gem. per Sessie"
              value={
                questionsData?.chatStats?.avgPerSession
                  ? questionsData.chatStats.avgPerSession.toFixed(1)
                  : "0"
              }
              icon={MessageSquare}
            />
            <KPICard
              title="Tevredenheid"
              value={
                questionsData?.feedback?.total
                  ? `${Math.round(
                      (questionsData.feedback.positive /
                        questionsData.feedback.total) *
                        100
                    )}%`
                  : "—"
              }
              icon={Target}
              subtitle={
                questionsData?.feedback?.total
                  ? `${questionsData.feedback.positive} positief, ${questionsData.feedback.negative} negatief`
                  : undefined
              }
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Categories */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-semibold">
                  Vraagcategorieen
                </CardTitle>
              </CardHeader>
              <CardContent>
                {categoryData.length > 0 ? (
                  <DonutChart data={categoryData} height={180} />
                ) : (
                  <p className="text-sm text-gray-400">Geen data</p>
                )}
              </CardContent>
            </Card>

            {/* Questions Table */}
            <Card className="border-0 shadow-sm lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base font-semibold">
                  Gestelde Vragen
                </CardTitle>
              </CardHeader>
              <CardContent>
                <QuestionsTable
                  questions={questionsData?.questions || []}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TAB: BEGRIPPEN */}
        <TabsContent value="begrippen" className="space-y-6">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-semibold">
                Term Engagement
              </CardTitle>
            </CardHeader>
            <CardContent>
              <TermsTable terms={termsData?.terms || []} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB: BEZOEKERS */}
        <TabsContent value="bezoekers" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-semibold">
                  Apparaten
                </CardTitle>
              </CardHeader>
              <CardContent>
                {visitorsData?.deviceBreakdown ? (
                  <DonutChart
                    data={[
                      {
                        name: "Desktop",
                        value: visitorsData.deviceBreakdown.desktop,
                        color: CHART_COLORS.devices.desktop,
                      },
                      {
                        name: "Mobile",
                        value: visitorsData.deviceBreakdown.mobile,
                        color: CHART_COLORS.devices.mobile,
                      },
                      {
                        name: "Tablet",
                        value: visitorsData.deviceBreakdown.tablet,
                        color: CHART_COLORS.devices.tablet,
                      },
                    ]}
                    height={180}
                  />
                ) : (
                  <p className="text-sm text-gray-400">Geen data</p>
                )}
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-semibold">
                  Locaties
                </CardTitle>
              </CardHeader>
              <CardContent>
                {visitorsData?.countries && visitorsData.countries.length > 0 ? (
                  <HorizontalBarChart
                    data={visitorsData.countries.map((c) => ({
                      name: c.country,
                      value: c.count,
                    }))}
                  />
                ) : (
                  <p className="text-sm text-gray-400">Geen locatiedata</p>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-semibold">
                  Referrers
                </CardTitle>
              </CardHeader>
              <CardContent>
                {visitorsData?.referrers && visitorsData.referrers.length > 0 ? (
                  <HorizontalBarChart
                    data={visitorsData.referrers.map((r) => ({
                      name: r.referrer || "Direct",
                      value: r.count,
                    }))}
                  />
                ) : (
                  <p className="text-sm text-gray-400">Geen referrer data</p>
                )}
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-semibold">
                  Piekuren
                </CardTitle>
              </CardHeader>
              <CardContent>
                {visitorsData?.peakHours && visitorsData.peakHours.length > 0 ? (
                  <HeatmapGrid data={visitorsData.peakHours} />
                ) : (
                  <p className="text-sm text-gray-400">Geen data</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

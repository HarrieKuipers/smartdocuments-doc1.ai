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
  FileText,
  ArrowDownFromLine,
} from "lucide-react";
import KPICard from "@/components/analytics/cards/KPICard";
import PeriodSelector from "@/components/analytics/filters/PeriodSelector";
import DateRangePicker from "@/components/analytics/filters/DateRangePicker";
import TimeSeriesChart from "@/components/analytics/charts/TimeSeriesChart";
import DonutChart from "@/components/analytics/charts/DonutChart";
import HorizontalBarChart from "@/components/analytics/charts/HorizontalBarChart";
import ScrollHeatmap from "@/components/analytics/charts/ScrollHeatmap";
import HeatmapGrid from "@/components/analytics/charts/HeatmapGrid";
import HistogramChart from "@/components/analytics/charts/HistogramChart";
import BubbleCloud from "@/components/analytics/charts/BubbleCloud";
import QuestionsTable from "@/components/analytics/tables/QuestionsTable";
import TermsTable from "@/components/analytics/tables/TermsTable";
import AIInsightCard, {
  type Insight,
} from "@/components/analytics/insights/AIInsightCard";
import LiveViewers from "@/components/analytics/LiveViewers";
import FeedbackOverview from "@/components/analytics/FeedbackOverview";
import { CHART_COLORS, type Period } from "@/lib/analytics/constants";
import { formatDuration } from "@/lib/analytics/helpers";

interface DocumentAnalytics {
  document: {
    _id: string;
    title: string;
    shortId: string;
    createdAt: string;
  };
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

interface SectionsData {
  sections: {
    sectionId: string;
    sectionTitle: string;
    views: number;
    uniqueVisitors: number;
    dropOffRate: number;
    retentionFromPrevious: number;
    topQuestions: string[];
    questionCount: number;
    topTerms: { term: string; clicks: number }[];
  }[];
  totalSessions: number;
}

interface InsightsData {
  insights: Insight[];
  clusters: {
    label: string;
    questions: string[];
    count: number;
    representativeQuestion: string;
  }[];
}

interface ReadTimeData {
  distribution: { label: string; count: number }[];
  totalSessions: number;
  avgReadTimeSeconds: number;
  medianReadTimeSeconds: number;
}

export default function DocumentAnalyticsPage() {
  const params = useParams();
  const router = useRouter();
  const documentId = params.documentId as string;

  const [period, setPeriod] = useState<Period>("30d");
  const [customRange, setCustomRange] = useState<{
    start: string;
    end: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DocumentAnalytics | null>(null);

  // Tab data (lazy loaded)
  const [questionsData, setQuestionsData] = useState<QuestionsData | null>(
    null
  );
  const [termsData, setTermsData] = useState<TermsData | null>(null);
  const [visitorsData, setVisitorsData] = useState<VisitorsData | null>(null);
  const [heatmapData, setHeatmapData] = useState<HeatmapData | null>(null);
  const [sectionsData, setSectionsData] = useState<SectionsData | null>(null);
  const [insightsData, setInsightsData] = useState<InsightsData | null>(null);
  const [readTimeData, setReadTimeData] = useState<ReadTimeData | null>(null);
  const [activeTab, setActiveTab] = useState("overzicht");

  const periodParam = customRange
    ? `period=custom&startDate=${customRange.start}&endDate=${customRange.end}`
    : `period=${period}`;

  const fetchMain = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/analytics/documents/${documentId}?${periodParam}`
      );
      if (res.ok) {
        setData(await res.json());
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [documentId, periodParam]);

  useEffect(() => {
    fetchMain();
  }, [fetchMain]);

  // Lazy load tab data
  useEffect(() => {
    if (activeTab === "chat" && !questionsData) {
      fetch(
        `/api/analytics/documents/${documentId}/questions?${periodParam}`
      )
        .then((r) => r.json())
        .then(setQuestionsData)
        .catch(() => {});
    }
    if (activeTab === "begrippen" && !termsData) {
      fetch(`/api/analytics/documents/${documentId}/terms?${periodParam}`)
        .then((r) => r.json())
        .then(setTermsData)
        .catch(() => {});
    }
    if (activeTab === "bezoekers" && !visitorsData) {
      fetch(
        `/api/analytics/documents/${documentId}/visitors?${periodParam}`
      )
        .then((r) => r.json())
        .then(setVisitorsData)
        .catch(() => {});
    }
    if (activeTab === "secties" && !heatmapData) {
      fetch(
        `/api/analytics/documents/${documentId}/heatmap?${periodParam}`
      )
        .then((r) => r.json())
        .then(setHeatmapData)
        .catch(() => {});
    }
    if (activeTab === "secties" && !sectionsData) {
      fetch(
        `/api/analytics/documents/${documentId}/sections?${periodParam}`
      )
        .then((r) => r.json())
        .then(setSectionsData)
        .catch(() => {});
    }
    if (activeTab === "overzicht" && !insightsData) {
      fetch(
        `/api/analytics/documents/${documentId}/insights?${periodParam}`
      )
        .then((r) => r.json())
        .then(setInsightsData)
        .catch(() => {});
    }
    if (activeTab === "overzicht" && !readTimeData) {
      fetch(
        `/api/analytics/documents/${documentId}/readtime?${periodParam}`
      )
        .then((r) => r.json())
        .then(setReadTimeData)
        .catch(() => {});
    }
  }, [
    activeTab,
    documentId,
    periodParam,
    questionsData,
    termsData,
    visitorsData,
    heatmapData,
    sectionsData,
    insightsData,
    readTimeData,
  ]);

  // Reset tab data when period changes
  useEffect(() => {
    setQuestionsData(null);
    setTermsData(null);
    setVisitorsData(null);
    setHeatmapData(null);
    setSectionsData(null);
    setInsightsData(null);
    setReadTimeData(null);
  }, [period, customRange]);

  function handleExport(format: "csv" | "pdf") {
    window.open(
      `/api/analytics/documents/${documentId}/export?format=${format}&${periodParam}`,
      "_blank"
    );
  }

  function handleCustomRange(start: string, end: string) {
    setCustomRange({ start, end });
    setPeriod("30d");
  }

  function handlePeriodChange(p: Period) {
    setPeriod(p);
    setCustomRange(null);
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

  const categoryData =
    questionsData?.categories?.map((c) => ({
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
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport("csv")}
          >
            <FileDown className="mr-2 h-4 w-4" />
            CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport("pdf")}
          >
            <FileText className="mr-2 h-4 w-4" />
            PDF
          </Button>
          <DateRangePicker
            startDate={customRange?.start}
            endDate={customRange?.end}
            onChange={handleCustomRange}
          />
          <PeriodSelector value={period} onChange={handlePeriodChange} />
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
          <TabsTrigger value="feedback">Feedback</TabsTrigger>
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

          {/* AI Insights */}
          {insightsData?.insights && insightsData.insights.length > 0 && (
            <AIInsightCard insights={insightsData.insights} />
          )}

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

          {/* Read Time Distribution + Device */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-semibold">
                  Leestijd Distributie
                </CardTitle>
              </CardHeader>
              <CardContent>
                {readTimeData?.distribution &&
                readTimeData.distribution.some((d) => d.count > 0) ? (
                  <div>
                    <HistogramChart data={readTimeData.distribution} />
                    <div className="mt-3 flex gap-4 text-xs text-gray-500">
                      <span>
                        Gemiddeld:{" "}
                        {formatDuration(readTimeData.avgReadTimeSeconds)}
                      </span>
                      <span>
                        Mediaan:{" "}
                        {formatDuration(readTimeData.medianReadTimeSeconds)}
                      </span>
                      <span>Sessies: {readTimeData.totalSessions}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">Nog geen data</p>
                )}
              </CardContent>
            </Card>
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
          </div>

          {/* Referrers + Live Viewers */}
          <div className="grid gap-6 lg:grid-cols-2">
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
            <LiveViewers documentId={documentId} />
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
              {heatmapData?.sectionViews &&
              heatmapData.sectionViews.length > 0 ? (
                <ScrollHeatmap
                  sections={heatmapData.sectionViews}
                  totalSessions={heatmapData.totalSessions}
                />
              ) : (
                <p className="text-sm text-gray-400">
                  Nog geen sectie data beschikbaar.
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
              {heatmapData?.scrollDepth &&
              heatmapData.scrollDepth.length > 0 ? (
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

          {/* Section Detail with Drop-off */}
          {sectionsData?.sections && sectionsData.sections.length > 0 && (
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-semibold">
                  Secties Detail
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {sectionsData.sections.map((section, idx) => (
                    <div
                      key={section.sectionId}
                      className="rounded-lg border border-gray-100 p-4"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="text-sm font-medium text-gray-900">
                            {idx + 1}. {section.sectionTitle}
                          </h4>
                          <div className="mt-1 flex gap-4 text-xs text-gray-500">
                            <span>{section.views} views</span>
                            <span>
                              {section.uniqueVisitors} unieke bezoekers
                            </span>
                            {section.questionCount > 0 && (
                              <span>{section.questionCount} vragen</span>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-1">
                            <ArrowDownFromLine className="h-3 w-3 text-red-400" />
                            <span className="text-sm font-medium text-red-500">
                              {section.dropOffRate}% drop-off
                            </span>
                          </div>
                          {idx > 0 && (
                            <span className="text-xs text-gray-400">
                              {section.retentionFromPrevious}% retentie
                            </span>
                          )}
                        </div>
                      </div>

                      {section.topQuestions.length > 0 && (
                        <div className="mt-3 border-t border-gray-50 pt-2">
                          <p className="text-xs font-medium text-gray-500">
                            Meest gestelde vragen:
                          </p>
                          <ul className="mt-1 space-y-1">
                            {section.topQuestions.slice(0, 3).map((q, i) => (
                              <li key={i} className="text-xs text-gray-600">
                                &ldquo;{q}&rdquo;
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {section.topTerms.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {section.topTerms.slice(0, 5).map((t) => (
                            <span
                              key={t.term}
                              className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-600"
                            >
                              {t.term} ({t.clicks})
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* TAB: AI CHAT */}
        <TabsContent value="chat" className="space-y-6">
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

          {/* Clustered Questions */}
          {insightsData?.clusters && insightsData.clusters.length > 0 && (
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-semibold">
                  Meest Gestelde Vragen (gegroepeerd)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {insightsData.clusters.map((cluster, i) => (
                    <div
                      key={i}
                      className="rounded-lg border border-gray-100 p-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-900">
                          {i + 1}. &ldquo;{cluster.label}&rdquo;
                        </span>
                        <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-600">
                          {cluster.count}x gesteld
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-gray-500">
                        Voorbeeld: &ldquo;{cluster.representativeQuestion}
                        &rdquo;
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* TAB: BEGRIPPEN */}
        <TabsContent value="begrippen" className="space-y-6">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-semibold">
                Term Overzicht
              </CardTitle>
            </CardHeader>
            <CardContent>
              <BubbleCloud
                data={
                  termsData?.terms?.map((t) => ({
                    term: t.term,
                    clicks: t.clicks,
                  })) || []
                }
              />
            </CardContent>
          </Card>

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
                {visitorsData?.countries &&
                visitorsData.countries.length > 0 ? (
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
                {visitorsData?.referrers &&
                visitorsData.referrers.length > 0 ? (
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
                {visitorsData?.peakHours &&
                visitorsData.peakHours.length > 0 ? (
                  <HeatmapGrid data={visitorsData.peakHours} />
                ) : (
                  <p className="text-sm text-gray-400">Geen data</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TAB: FEEDBACK */}
        <TabsContent value="feedback" className="space-y-6">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-semibold">
                Lezer Feedback
              </CardTitle>
            </CardHeader>
            <CardContent>
              <FeedbackOverview documentId={documentId} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

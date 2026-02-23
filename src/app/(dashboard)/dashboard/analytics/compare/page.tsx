"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft } from "lucide-react";
import PeriodSelector from "@/components/analytics/filters/PeriodSelector";
import TimeSeriesChart from "@/components/analytics/charts/TimeSeriesChart";
import { CHART_COLORS, type Period } from "@/lib/analytics/constants";
import { formatDuration } from "@/lib/analytics/helpers";

interface ComparisonDoc {
  document: { _id: string; title: string; shortId: string };
  stats: {
    totalViews: number;
    uniqueVisitors: number;
    totalDownloads: number;
    totalChatMessages: number;
    totalTermClicks: number;
    avgReadTime: number;
    avgScrollDepth: number;
    completionRate: number;
  };
  timeseries: { date: string; views: number }[];
}

interface CompareData {
  comparisons: ComparisonDoc[];
}

const METRIC_LABELS: Record<string, string> = {
  totalViews: "Views",
  uniqueVisitors: "Unieke Bezoekers",
  totalDownloads: "Downloads",
  totalChatMessages: "AI Vragen",
  totalTermClicks: "Term Kliks",
  avgReadTime: "Gem. Leestijd",
  avgScrollDepth: "Scroll Diepte",
  completionRate: "Completie Rate",
};

export default function ComparePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-400">Laden...</div>}>
      <CompareContent />
    </Suspense>
  );
}

function CompareContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const documentIds = searchParams.get("documents")?.split(",") || [];

  const [period, setPeriod] = useState<Period>("30d");
  const [data, setData] = useState<CompareData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (documentIds.length < 2) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/analytics/compare?documents=${documentIds.join(",")}&period=${period}`
      );
      if (res.ok) {
        setData(await res.json());
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [period, documentIds.join(",")]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (documentIds.length < 2) {
    return (
      <div className="space-y-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/dashboard/analytics")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Terug
        </Button>
        <p className="text-sm text-gray-500">
          Selecteer minimaal 2 documenten om te vergelijken.
        </p>
      </div>
    );
  }

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  const comparisons = data?.comparisons || [];

  // Merge timeseries for the chart
  const dateSet = new Set<string>();
  for (const c of comparisons) {
    for (const t of c.timeseries) {
      dateSet.add(t.date);
    }
  }
  const dates = Array.from(dateSet).sort();
  const mergedTimeseries = dates.map((date) => {
    const entry: { date: string; [key: string]: string | number } = { date };
    for (const c of comparisons) {
      const point = c.timeseries.find((t) => t.date === date);
      entry[c.document._id] = point?.views || 0;
    }
    return entry;
  });

  const series = comparisons.map((c, i) => ({
    key: c.document._id,
    label: c.document.title.length > 25
      ? c.document.title.slice(0, 25) + "..."
      : c.document.title,
    color: CHART_COLORS.series[i % CHART_COLORS.series.length],
  }));

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
          <h1 className="text-2xl font-bold">Documenten Vergelijken</h1>
        </div>
        <PeriodSelector value={period} onChange={setPeriod} />
      </div>

      {/* Views Chart */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            Views Over Tijd
          </CardTitle>
        </CardHeader>
        <CardContent>
          {mergedTimeseries.length > 0 ? (
            <TimeSeriesChart
              data={mergedTimeseries}
              series={series}
              height={300}
            />
          ) : (
            <div className="flex h-[300px] items-center justify-center text-sm text-gray-400">
              Geen data beschikbaar
            </div>
          )}
        </CardContent>
      </Card>

      {/* Metrics Comparison Table */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            Metrics Vergelijking
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="px-3 py-2 text-left font-medium text-gray-500">
                    Metric
                  </th>
                  {comparisons.map((c, i) => (
                    <th
                      key={c.document._id}
                      className="px-3 py-2 text-right font-medium"
                      style={{
                        color:
                          CHART_COLORS.series[
                            i % CHART_COLORS.series.length
                          ],
                      }}
                    >
                      {c.document.title.length > 20
                        ? c.document.title.slice(0, 20) + "..."
                        : c.document.title}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.entries(METRIC_LABELS).map(([key, label]) => {
                  const values = comparisons.map(
                    (c) =>
                      c.stats[key as keyof ComparisonDoc["stats"]] || 0
                  );
                  const maxVal = Math.max(...values);

                  return (
                    <tr key={key} className="border-b last:border-0">
                      <td className="px-3 py-3 font-medium text-gray-700">
                        {label}
                      </td>
                      {comparisons.map((c, i) => {
                        const val =
                          c.stats[key as keyof ComparisonDoc["stats"]] || 0;
                        const isMax = val === maxVal && val > 0;
                        const displayVal =
                          key === "avgReadTime"
                            ? formatDuration(val)
                            : key === "avgScrollDepth" ||
                                key === "completionRate"
                              ? `${Math.round(val)}%`
                              : val;

                        return (
                          <td
                            key={c.document._id}
                            className={`px-3 py-3 text-right ${isMax ? "font-bold text-gray-900" : "text-gray-600"}`}
                          >
                            {displayVal}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

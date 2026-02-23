"use client";

import { Card, CardContent } from "@/components/ui/card";
import {
  Lightbulb,
  TrendingUp,
  AlertTriangle,
  Trophy,
  type LucideIcon,
} from "lucide-react";

export interface Insight {
  type: "suggestion" | "trend" | "anomaly" | "achievement";
  priority: "high" | "medium" | "low";
  title: string;
  description: string;
  actionable: boolean;
  suggestedAction: string | null;
}

interface AIInsightCardProps {
  insights: Insight[];
}

const typeConfig: Record<
  Insight["type"],
  { icon: LucideIcon; color: string; bg: string; label: string }
> = {
  suggestion: {
    icon: Lightbulb,
    color: "text-amber-600",
    bg: "bg-amber-50",
    label: "Suggestie",
  },
  trend: {
    icon: TrendingUp,
    color: "text-blue-600",
    bg: "bg-blue-50",
    label: "Trend",
  },
  anomaly: {
    icon: AlertTriangle,
    color: "text-red-600",
    bg: "bg-red-50",
    label: "Anomalie",
  },
  achievement: {
    icon: Trophy,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    label: "Prestatie",
  },
};

const priorityBorder: Record<Insight["priority"], string> = {
  high: "border-l-red-400",
  medium: "border-l-amber-400",
  low: "border-l-gray-300",
};

export default function AIInsightCard({ insights }: AIInsightCardProps) {
  if (insights.length === 0) return null;

  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-5">
        <div className="mb-4 flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-amber-500" />
          <h3 className="text-sm font-semibold text-gray-900">
            AI Inzichten
          </h3>
        </div>
        <div className="space-y-3">
          {insights.map((insight, i) => {
            const config = typeConfig[insight.type];
            const Icon = config.icon;

            return (
              <div
                key={i}
                className={`rounded-lg border-l-4 bg-gray-50 p-3 ${priorityBorder[insight.priority]}`}
              >
                <div className="mb-1 flex items-center gap-2">
                  <div
                    className={`flex h-5 w-5 items-center justify-center rounded ${config.bg}`}
                  >
                    <Icon className={`h-3 w-3 ${config.color}`} />
                  </div>
                  <span className="text-xs font-medium text-gray-400">
                    {config.label}
                  </span>
                  <span className="text-sm font-medium text-gray-900">
                    {insight.title}
                  </span>
                </div>
                <p className="ml-7 text-sm text-gray-600">
                  {insight.description}
                </p>
                {insight.suggestedAction && (
                  <p className="ml-7 mt-1 text-xs font-medium text-blue-600">
                    {insight.suggestedAction}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

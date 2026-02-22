"use client";

import { CHART_COLORS } from "@/lib/analytics/constants";

interface ScrollHeatmapProps {
  sections: {
    sectionId: string;
    title: string;
    views: number;
    uniqueVisitors: number;
  }[];
  totalSessions: number;
}

export default function ScrollHeatmap({
  sections,
  totalSessions,
}: ScrollHeatmapProps) {
  const maxViews = Math.max(...sections.map((s) => s.views), 1);

  function getHeatColor(views: number) {
    const ratio = views / maxViews;
    const colors = CHART_COLORS.heatmap;
    const index = Math.min(
      Math.floor(ratio * (colors.length - 1)),
      colors.length - 1
    );
    return colors[index];
  }

  return (
    <div className="space-y-2">
      {sections.map((section) => {
        const percentage =
          totalSessions > 0
            ? Math.round((section.uniqueVisitors / totalSessions) * 100)
            : 0;

        return (
          <div key={section.sectionId} className="flex items-center gap-3">
            <div className="w-32 truncate text-sm text-gray-600" title={section.title}>
              {section.title}
            </div>
            <div className="flex-1">
              <div className="h-6 w-full overflow-hidden rounded bg-gray-50">
                <div
                  className="flex h-full items-center rounded px-2 text-xs font-medium text-white transition-all"
                  style={{
                    width: `${Math.max(percentage, 5)}%`,
                    backgroundColor: getHeatColor(section.views),
                  }}
                >
                  {percentage}%
                </div>
              </div>
            </div>
            <span className="w-12 text-right text-xs text-gray-400">
              {section.views}x
            </span>
          </div>
        );
      })}
    </div>
  );
}

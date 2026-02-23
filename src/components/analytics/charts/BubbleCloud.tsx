"use client";

import { CHART_COLORS } from "@/lib/analytics/constants";

interface BubbleData {
  term: string;
  clicks: number;
}

interface BubbleCloudProps {
  data: BubbleData[];
  height?: number;
}

export default function BubbleCloud({ data, height = 280 }: BubbleCloudProps) {
  if (data.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-sm text-gray-400"
        style={{ height }}
      >
        Geen term data beschikbaar
      </div>
    );
  }

  const maxClicks = Math.max(...data.map((d) => d.clicks), 1);
  const minClicks = Math.min(...data.map((d) => d.clicks), 0);
  const range = maxClicks - minClicks || 1;

  return (
    <div
      className="flex flex-wrap items-center justify-center gap-2 p-4"
      style={{ minHeight: height }}
    >
      {data.map((item, i) => {
        const ratio = (item.clicks - minClicks) / range;
        const fontSize = 12 + ratio * 20; // 12px to 32px
        const padding = 4 + ratio * 8;
        const colorIndex = i % CHART_COLORS.series.length;
        const opacity = 0.6 + ratio * 0.4;

        return (
          <span
            key={item.term}
            className="inline-block cursor-default rounded-full transition-transform hover:scale-110"
            style={{
              fontSize: `${fontSize}px`,
              padding: `${padding}px ${padding * 1.5}px`,
              backgroundColor: CHART_COLORS.series[colorIndex],
              color: "#fff",
              opacity,
              fontWeight: ratio > 0.5 ? 600 : 400,
            }}
            title={`${item.term}: ${item.clicks} kliks`}
          >
            {item.term}
          </span>
        );
      })}
    </div>
  );
}

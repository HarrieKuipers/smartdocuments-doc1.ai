"use client";

import { CHART_COLORS } from "@/lib/analytics/constants";

interface HeatmapGridProps {
  data: {
    dayOfWeek: number; // 1=Sunday, 2=Monday, ..., 7=Saturday (MongoDB $dayOfWeek)
    hour: number;
    count: number;
  }[];
}

const DAY_LABELS = ["Zo", "Ma", "Di", "Wo", "Do", "Vr", "Za"];

export default function HeatmapGrid({ data }: HeatmapGridProps) {
  const maxCount = Math.max(...data.map((d) => d.count), 1);
  const colors = CHART_COLORS.heatmap;

  // Build a grid: 7 days x 24 hours
  const grid = Array.from({ length: 7 }, () => Array(24).fill(0));
  for (const d of data) {
    // MongoDB dayOfWeek: 1=Sunday...7=Saturday
    const dayIndex = d.dayOfWeek - 1;
    if (dayIndex >= 0 && dayIndex < 7 && d.hour >= 0 && d.hour < 24) {
      grid[dayIndex][d.hour] = d.count;
    }
  }

  // Reorder to start with Monday (index 1 in grid -> first row)
  const orderedGrid = [
    grid[1], // Ma
    grid[2], // Di
    grid[3], // Wo
    grid[4], // Do
    grid[5], // Vr
    grid[6], // Za
    grid[0], // Zo
  ];
  const orderedLabels = ["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"];

  function getCellColor(count: number) {
    if (count === 0) return colors[0];
    const ratio = count / maxCount;
    const index = Math.min(
      Math.floor(ratio * (colors.length - 1)) + 1,
      colors.length - 1
    );
    return colors[index];
  }

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[400px]">
        {/* Hour labels */}
        <div className="mb-1 ml-8 flex">
          {Array.from({ length: 24 }, (_, i) => (
            <div
              key={i}
              className="flex-1 text-center text-[10px] text-gray-400"
            >
              {i % 3 === 0 ? `${i}h` : ""}
            </div>
          ))}
        </div>

        {/* Grid rows */}
        {orderedGrid.map((row, dayIdx) => (
          <div key={dayIdx} className="flex items-center gap-1">
            <span className="w-7 text-right text-xs text-gray-500">
              {orderedLabels[dayIdx]}
            </span>
            <div className="flex flex-1 gap-px">
              {row.map((count: number, hour: number) => (
                <div
                  key={hour}
                  className="flex-1 rounded-sm transition-colors"
                  style={{
                    backgroundColor: getCellColor(count),
                    height: "16px",
                  }}
                  title={`${orderedLabels[dayIdx]} ${hour}:00 — ${count} views`}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

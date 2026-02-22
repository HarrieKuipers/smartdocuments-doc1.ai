"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { CHART_COLORS } from "@/lib/analytics/constants";

interface DonutData {
  name: string;
  value: number;
  color?: string;
}

interface DonutChartProps {
  data: DonutData[];
  height?: number;
  colors?: string[];
  showLegend?: boolean;
}

export default function DonutChart({
  data,
  height = 200,
  colors = [...CHART_COLORS.series],
  showLegend = true,
}: DonutChartProps) {
  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="flex items-center gap-4">
      <ResponsiveContainer width={height} height={height}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={height * 0.28}
            outerRadius={height * 0.42}
            paddingAngle={2}
            dataKey="value"
            strokeWidth={0}
          >
            {data.map((entry, index) => (
              <Cell
                key={entry.name}
                fill={entry.color || colors[index % colors.length]}
              />
            ))}
          </Pie>
          <Tooltip
            formatter={(value) => [
              `${value} (${total > 0 ? Math.round((Number(value) / total) * 100) : 0}%)`,
            ]}
            contentStyle={{
              borderRadius: "8px",
              border: "none",
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
              fontSize: "13px",
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      {showLegend && (
        <div className="space-y-2">
          {data.map((entry, index) => (
            <div key={entry.name} className="flex items-center gap-2">
              <div
                className="h-2.5 w-2.5 rounded-full"
                style={{
                  backgroundColor:
                    entry.color || colors[index % colors.length],
                }}
              />
              <span className="text-sm text-gray-600">{entry.name}</span>
              <span className="text-sm font-medium text-gray-900">
                {total > 0 ? Math.round((entry.value / total) * 100) : 0}%
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

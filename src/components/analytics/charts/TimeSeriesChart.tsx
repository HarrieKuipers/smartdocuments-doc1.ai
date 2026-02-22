"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { CHART_COLORS } from "@/lib/analytics/constants";
import { format, parseISO } from "date-fns";
import { nl } from "date-fns/locale";

interface TimeSeriesData {
  date: string;
  [key: string]: string | number;
}

interface Series {
  key: string;
  label: string;
  color?: string;
}

interface TimeSeriesChartProps {
  data: TimeSeriesData[];
  series: Series[];
  height?: number;
}

export default function TimeSeriesChart({
  data,
  series,
  height = 300,
}: TimeSeriesChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
        <defs>
          {series.map((s, i) => (
            <linearGradient
              key={s.key}
              id={`gradient-${s.key}`}
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop
                offset="5%"
                stopColor={s.color || CHART_COLORS.series[i]}
                stopOpacity={0.15}
              />
              <stop
                offset="95%"
                stopColor={s.color || CHART_COLORS.series[i]}
                stopOpacity={0}
              />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis
          dataKey="date"
          tickFormatter={(val) => {
            try {
              return format(parseISO(val), "d MMM", { locale: nl });
            } catch {
              return val;
            }
          }}
          tick={{ fontSize: 12, fill: "#9CA3AF" }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tick={{ fontSize: 12, fill: "#9CA3AF" }}
          tickLine={false}
          axisLine={false}
          width={40}
        />
        <Tooltip
          labelFormatter={(label) => {
            try {
              return format(parseISO(label as string), "d MMMM yyyy", {
                locale: nl,
              });
            } catch {
              return label;
            }
          }}
          contentStyle={{
            borderRadius: "12px",
            border: "none",
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
            fontSize: "13px",
          }}
        />
        {series.length > 1 && (
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: "13px", paddingTop: "8px" }}
          />
        )}
        {series.map((s, i) => (
          <Area
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.label}
            stroke={s.color || CHART_COLORS.series[i]}
            strokeWidth={2}
            fill={`url(#gradient-${s.key})`}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}

export const CHART_COLORS = {
  primary: "#2563EB",
  secondary: "#7C3AED",
  success: "#10B981",
  warning: "#F59E0B",
  danger: "#EF4444",
  neutral: "#6B7280",
  series: [
    "#2563EB",
    "#7C3AED",
    "#10B981",
    "#F59E0B",
    "#EF4444",
    "#06B6D4",
  ],
  heatmap: ["#EFF6FF", "#BFDBFE", "#60A5FA", "#2563EB", "#1D4ED8"],
  devices: {
    desktop: "#2563EB",
    mobile: "#7C3AED",
    tablet: "#10B981",
  },
} as const;

export const PERIOD_OPTIONS = [
  { label: "7 dagen", value: "7d" },
  { label: "30 dagen", value: "30d" },
  { label: "90 dagen", value: "90d" },
  { label: "12 maanden", value: "12m" },
  { label: "Alles", value: "all" },
] as const;

export type Period = (typeof PERIOD_OPTIONS)[number]["value"];

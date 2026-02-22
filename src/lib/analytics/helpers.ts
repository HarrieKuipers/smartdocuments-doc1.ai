import { subDays, subMonths, startOfDay, endOfDay } from "date-fns";
import type { Period } from "./constants";

export function getDateRange(period: Period | string, startDate?: string, endDate?: string) {
  const now = new Date();

  if (startDate && endDate) {
    return {
      start: startOfDay(new Date(startDate)),
      end: endOfDay(new Date(endDate)),
    };
  }

  switch (period) {
    case "7d":
      return { start: startOfDay(subDays(now, 7)), end: now };
    case "30d":
      return { start: startOfDay(subDays(now, 30)), end: now };
    case "90d":
      return { start: startOfDay(subDays(now, 90)), end: now };
    case "12m":
      return { start: startOfDay(subMonths(now, 12)), end: now };
    case "all":
      return { start: new Date(0), end: now };
    default:
      return { start: startOfDay(subDays(now, 30)), end: now };
  }
}

export function getPreviousPeriodRange(start: Date, end: Date) {
  const durationMs = end.getTime() - start.getTime();
  return {
    start: new Date(start.getTime() - durationMs),
    end: new Date(start.getTime()),
  };
}

export function calculateTrend(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

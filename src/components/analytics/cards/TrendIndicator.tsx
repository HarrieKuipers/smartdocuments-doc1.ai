"use client";

import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface TrendIndicatorProps {
  value: number;
  className?: string;
}

export default function TrendIndicator({ value, className = "" }: TrendIndicatorProps) {
  if (value === 0) {
    return (
      <span className={`inline-flex items-center gap-0.5 text-xs text-gray-400 ${className}`}>
        <Minus className="h-3 w-3" /> 0%
      </span>
    );
  }

  const isPositive = value > 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-xs font-medium ${
        isPositive ? "text-emerald-600" : "text-red-500"
      } ${className}`}
    >
      {isPositive ? (
        <TrendingUp className="h-3 w-3" />
      ) : (
        <TrendingDown className="h-3 w-3" />
      )}
      {isPositive ? "+" : ""}
      {value}%
    </span>
  );
}

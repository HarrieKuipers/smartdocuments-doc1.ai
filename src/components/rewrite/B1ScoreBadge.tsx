"use client";

interface B1ScoreBadgeProps {
  score: number;
  size?: "sm" | "md" | "lg";
}

export default function B1ScoreBadge({
  score,
  size = "md",
}: B1ScoreBadgeProps) {
  const getColor = () => {
    if (score >= 80) return "text-green-600 bg-green-50 border-green-200";
    if (score >= 60) return "text-orange-600 bg-orange-50 border-orange-200";
    return "text-red-600 bg-red-50 border-red-200";
  };

  const getBarColor = () => {
    if (score >= 80) return "bg-green-500";
    if (score >= 60) return "bg-orange-500";
    return "bg-red-500";
  };

  const sizeClasses = {
    sm: "text-xs px-2 py-1",
    md: "text-sm px-3 py-1.5",
    lg: "text-base px-4 py-2",
  };

  const barWidth = {
    sm: "w-16",
    md: "w-24",
    lg: "w-32",
  };

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-md border ${getColor()} ${sizeClasses[size]}`}
    >
      <span className="font-medium">B1-score:</span>
      <div className={`${barWidth[size]} h-2 bg-gray-200 rounded-full overflow-hidden`}>
        <div
          className={`h-full rounded-full transition-all ${getBarColor()}`}
          style={{ width: `${Math.min(100, score)}%` }}
        />
      </div>
      <span className="font-bold">{score}%</span>
    </div>
  );
}

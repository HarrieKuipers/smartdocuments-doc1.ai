"use client";

import { MessageSquare } from "lucide-react";

interface AnnotationBadgeProps {
  count: number;
  brandPrimary: string;
  onClick: () => void;
}

export default function AnnotationBadge({
  count,
  brandPrimary,
  onClick,
}: AnnotationBadgeProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium transition-colors hover:opacity-80"
      style={{
        backgroundColor: count > 0 ? `${brandPrimary}15` : undefined,
        color: count > 0 ? brandPrimary : "#9ca3af",
      }}
      title={`${count} annotatie${count !== 1 ? "s" : ""}`}
    >
      <MessageSquare className="h-3.5 w-3.5" />
      {count > 0 && <span>{count}</span>}
    </button>
  );
}

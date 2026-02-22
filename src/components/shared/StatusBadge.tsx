"use client";

import { Badge } from "@/components/ui/badge";
import type { DocumentRewriteStatus } from "@/types/rewrite";
import {
  REWRITE_STATUS_LABELS,
  REWRITE_STATUS_COLORS,
} from "@/types/rewrite";

interface StatusBadgeProps {
  status: DocumentRewriteStatus;
}

const COLOR_CLASSES: Record<string, string> = {
  gray: "bg-gray-100 text-gray-700 border-gray-200",
  blue: "bg-blue-100 text-blue-700 border-blue-200",
  orange: "bg-orange-100 text-orange-700 border-orange-200",
  green: "bg-green-100 text-green-700 border-green-200",
  red: "bg-red-100 text-red-700 border-red-200",
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  const color = REWRITE_STATUS_COLORS[status] || "gray";
  const label = REWRITE_STATUS_LABELS[status] || status;
  const classes = COLOR_CLASSES[color] || COLOR_CLASSES.gray;

  return (
    <Badge variant="outline" className={classes}>
      {label}
    </Badge>
  );
}

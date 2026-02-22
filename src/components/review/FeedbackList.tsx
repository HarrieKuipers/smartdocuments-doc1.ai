"use client";

import { Badge } from "@/components/ui/badge";
import { MessageSquare } from "lucide-react";
import type { SectionFeedback, FeedbackType } from "@/types/review";

interface FeedbackListProps {
  feedback: SectionFeedback[];
  generalFeedback?: string;
}

const TYPE_LABELS: Record<FeedbackType, string> = {
  general: "Algemeen",
  language: "Taal",
  content: "Inhoud",
  structure: "Structuur",
};

const TYPE_COLORS: Record<FeedbackType, string> = {
  general: "bg-gray-100 text-gray-700",
  language: "bg-blue-100 text-blue-700",
  content: "bg-purple-100 text-purple-700",
  structure: "bg-orange-100 text-orange-700",
};

export default function FeedbackList({
  feedback,
  generalFeedback,
}: FeedbackListProps) {
  if (feedback.length === 0 && !generalFeedback) {
    return (
      <div className="text-center py-6 text-sm text-muted-foreground">
        <MessageSquare className="size-8 mx-auto mb-2 text-muted-foreground/50" />
        Geen feedback ontvangen.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {generalFeedback && (
        <div className="p-4 border rounded-lg bg-muted/30">
          <h4 className="text-sm font-medium mb-2">Algemene feedback</h4>
          <p className="text-sm text-muted-foreground">{generalFeedback}</p>
        </div>
      )}

      {feedback.map((item) => (
        <div key={item.id} className="p-3 border rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">{item.sectionTitle}</span>
            <Badge
              variant="outline"
              className={`text-[10px] ${TYPE_COLORS[item.type]}`}
            >
              {TYPE_LABELS[item.type]}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mb-2">{item.comment}</p>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{item.author}</span>
            <span>
              {new Date(item.createdAt).toLocaleDateString("nl-NL", {
                day: "numeric",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

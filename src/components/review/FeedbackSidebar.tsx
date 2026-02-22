"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MessageSquare, Plus, X } from "lucide-react";
import type { FeedbackType } from "@/types/review";

interface FeedbackItem {
  sectionId: string;
  sectionTitle: string;
  comment: string;
  type: FeedbackType;
}

interface FeedbackSidebarProps {
  sections: Array<{ id: string; title: string }>;
  feedback: FeedbackItem[];
  onFeedbackChange: (feedback: FeedbackItem[]) => void;
  disabled?: boolean;
}

const FEEDBACK_TYPE_LABELS: Record<FeedbackType, string> = {
  general: "Algemeen",
  language: "Taal",
  content: "Inhoud",
  structure: "Structuur",
};

export default function FeedbackSidebar({
  sections,
  feedback,
  onFeedbackChange,
  disabled = false,
}: FeedbackSidebarProps) {
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [newComment, setNewComment] = useState("");
  const [newType, setNewType] = useState<FeedbackType>("general");

  const addFeedback = () => {
    if (!activeSectionId || !newComment.trim()) return;

    const section = sections.find((s) => s.id === activeSectionId);
    if (!section) return;

    onFeedbackChange([
      ...feedback,
      {
        sectionId: activeSectionId,
        sectionTitle: section.title,
        comment: newComment.trim(),
        type: newType,
      },
    ]);

    setNewComment("");
    setNewType("general");
    setActiveSectionId(null);
  };

  const removeFeedback = (index: number) => {
    onFeedbackChange(feedback.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <MessageSquare className="size-4" />
        <h3 className="font-medium text-sm">Feedback per sectie</h3>
      </div>

      {/* Existing feedback items */}
      {feedback.length > 0 && (
        <div className="space-y-2">
          {feedback.map((item, idx) => (
            <div
              key={idx}
              className="p-3 border rounded-lg bg-muted/30 text-sm"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-xs">
                  {item.sectionTitle}
                </span>
                {!disabled && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 w-5 p-0"
                    onClick={() => removeFeedback(idx)}
                  >
                    <X className="size-3" />
                  </Button>
                )}
              </div>
              <p className="text-muted-foreground">{item.comment}</p>
              <span className="text-[10px] text-muted-foreground mt-1 inline-block">
                {FEEDBACK_TYPE_LABELS[item.type]}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Add new feedback */}
      {!disabled && (
        <div className="space-y-3 p-3 border rounded-lg border-dashed">
          <div>
            <Label className="text-xs">Sectie</Label>
            <Select
              value={activeSectionId || ""}
              onValueChange={setActiveSectionId}
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="Kies een sectie..." />
              </SelectTrigger>
              <SelectContent>
                {sections.map((section) => (
                  <SelectItem key={section.id} value={section.id}>
                    {section.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs">Type</Label>
            <Select
              value={newType}
              onValueChange={(v) => setNewType(v as FeedbackType)}
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(FEEDBACK_TYPE_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs">Opmerking</Label>
            <Textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Schrijf je feedback..."
              className="text-sm min-h-[80px]"
            />
          </div>

          <Button
            size="sm"
            onClick={addFeedback}
            disabled={!activeSectionId || !newComment.trim()}
            className="w-full"
          >
            <Plus className="size-4 mr-1.5" />
            Feedback toevoegen
          </Button>
        </div>
      )}
    </div>
  );
}

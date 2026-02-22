"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Save,
  Loader2,
  RefreshCw,
  MessageSquare,
  Check,
  X,
} from "lucide-react";
import { toast } from "sonner";
import B1ScoreBadge from "./B1ScoreBadge";
import StatusBadge from "../shared/StatusBadge";
import type { ContentDiff, DocumentRewriteStatus } from "@/types/rewrite";
import type { SectionFeedback } from "@/types/review";

interface FeedbackItem extends SectionFeedback {
  processed?: boolean;
  rejected?: boolean;
}

interface PageEditorProps {
  rewriteId: string;
  content: string;
  diffs: ContentDiff[];
  b1Score: number;
  status: DocumentRewriteStatus;
  feedback: FeedbackItem[];
  onSave: (content: string) => Promise<void>;
  onRewriteSection?: (sectionId: string) => void;
}

export default function PageEditor({
  rewriteId,
  content,
  diffs,
  b1Score,
  status,
  feedback,
  onSave,
  onRewriteSection,
}: PageEditorProps) {
  const [editedContent, setEditedContent] = useState(content);
  const [saving, setSaving] = useState(false);
  const [feedbackItems, setFeedbackItems] = useState<FeedbackItem[]>(
    feedback.map((f) => ({ ...f, processed: false, rejected: false }))
  );
  const [selectedFeedback, setSelectedFeedback] = useState<string | null>(null);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await onSave(editedContent);
      toast.success("Wijzigingen opgeslagen.");
    } catch {
      toast.error("Kon wijzigingen niet opslaan.");
    } finally {
      setSaving(false);
    }
  }, [editedContent, onSave]);

  const markFeedbackProcessed = (feedbackId: string) => {
    setFeedbackItems((prev) =>
      prev.map((f) =>
        f.id === feedbackId ? { ...f, processed: true, rejected: false } : f
      )
    );
  };

  const markFeedbackRejected = (feedbackId: string) => {
    setFeedbackItems((prev) =>
      prev.map((f) =>
        f.id === feedbackId ? { ...f, rejected: true, processed: false } : f
      )
    );
  };

  const processedCount = feedbackItems.filter(
    (f) => f.processed || f.rejected
  ).length;

  return (
    <div className="flex h-full">
      {/* Feedback sidebar */}
      <div className="w-80 shrink-0 border-r overflow-y-auto bg-muted/30">
        <div className="p-4 border-b">
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare className="size-4" />
            <h3 className="font-medium text-sm">Feedback</h3>
          </div>
          {feedbackItems.length > 0 ? (
            <p className="text-xs text-muted-foreground">
              {processedCount}/{feedbackItems.length} verwerkt
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Geen feedback ontvangen.
            </p>
          )}
        </div>

        <div className="divide-y">
          {feedbackItems.map((item) => (
            <div
              key={item.id}
              className={`p-4 cursor-pointer transition-colors ${
                selectedFeedback === item.id
                  ? "bg-primary/5 border-l-2 border-primary"
                  : "hover:bg-muted/50"
              } ${item.processed ? "opacity-60" : ""}`}
              onClick={() => setSelectedFeedback(item.id)}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-muted-foreground">
                  {item.sectionTitle}
                </span>
                <Badge
                  variant="outline"
                  className="text-[10px]"
                >
                  {item.type}
                </Badge>
              </div>
              <p className="text-sm mb-2">{item.comment}</p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {item.author}
                </span>
                <div className="flex gap-1">
                  {!item.processed && !item.rejected && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          markFeedbackProcessed(item.id);
                        }}
                      >
                        <Check className="size-3 mr-1" />
                        Verwerkt
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          markFeedbackRejected(item.id);
                        }}
                      >
                        <X className="size-3 mr-1" />
                        Afwijzen
                      </Button>
                    </>
                  )}
                  {item.processed && (
                    <Badge className="bg-green-100 text-green-700 text-[10px]">
                      Verwerkt
                    </Badge>
                  )}
                  {item.rejected && (
                    <Badge className="bg-red-100 text-red-700 text-[10px]">
                      Afgewezen
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Editor area */}
      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        <div className="flex items-center justify-between p-3 border-b bg-muted/30">
          <div className="flex items-center gap-3">
            <StatusBadge status={status} />
            <B1ScoreBadge score={b1Score} size="sm" />
          </div>
          <div className="flex items-center gap-2">
            {onRewriteSection && selectedFeedback && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const item = feedbackItems.find(
                    (f) => f.id === selectedFeedback
                  );
                  if (item) onRewriteSection(item.sectionId);
                }}
              >
                <RefreshCw className="size-4 mr-1.5" />
                Opnieuw herschrijven
              </Button>
            )}
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? (
                <Loader2 className="size-4 mr-1.5 animate-spin" />
              ) : (
                <Save className="size-4 mr-1.5" />
              )}
              Opslaan
            </Button>
          </div>
        </div>

        {/* Content editor (plain textarea for now, Tiptap integration later) */}
        <div className="flex-1 p-4 overflow-y-auto">
          <Textarea
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
            className="min-h-[600px] font-mono text-sm resize-none border-0 shadow-none focus-visible:ring-0"
            placeholder="Document inhoud..."
          />
        </div>
      </div>
    </div>
  );
}

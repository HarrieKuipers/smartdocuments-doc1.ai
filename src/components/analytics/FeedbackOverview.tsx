"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ThumbsUp,
  ThumbsDown,
  AlertTriangle,
  Brain,
  Feather,
  MessageSquare,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface FeedbackCounts {
  unclear: number;
  helpful: number;
  incorrect: number;
  "too-complex": number;
  "too-simple": number;
}

interface SectionFeedback {
  sectionType: string;
  sectionIndex?: number;
  sectionTitle?: string;
  total: number;
  counts: FeedbackCounts;
  comments: {
    comment: string;
    feedbackType: string;
    createdAt: string;
  }[];
}

interface FeedbackComment {
  _id: string;
  sectionType: string;
  sectionIndex?: number;
  sectionTitle?: string;
  feedbackType: string;
  comment: string;
  createdAt: string;
}

interface FeedbackData {
  sections: SectionFeedback[];
  total: number;
  comments: FeedbackComment[];
  totalComments: number;
  page: number;
  totalPages: number;
}

const FEEDBACK_TYPE_LABELS: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  helpful: { label: "Duidelijk", icon: <ThumbsUp className="h-3.5 w-3.5" />, color: "text-green-600" },
  unclear: { label: "Onduidelijk", icon: <ThumbsDown className="h-3.5 w-3.5" />, color: "text-red-500" },
  incorrect: { label: "Onjuist", icon: <AlertTriangle className="h-3.5 w-3.5" />, color: "text-orange-500" },
  "too-complex": { label: "Te complex", icon: <Brain className="h-3.5 w-3.5" />, color: "text-purple-500" },
  "too-simple": { label: "Te eenvoudig", icon: <Feather className="h-3.5 w-3.5" />, color: "text-blue-500" },
};

const SECTION_TYPE_LABELS: Record<string, string> = {
  summary: "Samenvatting",
  keyPoint: "Kernpunt",
  finding: "Bevinding",
  term: "Begrip",
};

function FeedbackBar({ counts, total }: { counts: FeedbackCounts; total: number }) {
  if (total === 0) return null;

  const segments = [
    { key: "helpful", count: counts.helpful, color: "bg-green-500" },
    { key: "unclear", count: counts.unclear, color: "bg-red-400" },
    { key: "incorrect", count: counts.incorrect, color: "bg-orange-400" },
    { key: "too-complex", count: counts["too-complex"], color: "bg-purple-400" },
    { key: "too-simple", count: counts["too-simple"], color: "bg-blue-400" },
  ];

  return (
    <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted">
      {segments.map(
        (seg) =>
          seg.count > 0 && (
            <div
              key={seg.key}
              className={`${seg.color} transition-all`}
              style={{ width: `${(seg.count / total) * 100}%` }}
              title={`${FEEDBACK_TYPE_LABELS[seg.key]?.label}: ${seg.count}`}
            />
          )
      )}
    </div>
  );
}

function getSectionLabel(section: SectionFeedback): string {
  if (section.sectionTitle) return section.sectionTitle;
  const typeLabel = SECTION_TYPE_LABELS[section.sectionType] || section.sectionType;
  if (section.sectionIndex !== undefined && section.sectionIndex !== null) {
    return `${typeLabel} ${section.sectionIndex + 1}`;
  }
  return typeLabel;
}

interface FeedbackOverviewProps {
  documentId: string;
}

export default function FeedbackOverview({ documentId }: FeedbackOverviewProps) {
  const [data, setData] = useState<FeedbackData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string | null>(null);
  const [commentPage, setCommentPage] = useState(1);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("page", String(commentPage));
      if (filterType) params.set("feedbackType", filterType);

      const res = await fetch(
        `/api/analytics/documents/${documentId}/feedback?${params.toString()}`
      );
      if (!res.ok) throw new Error("Kon feedback niet ophalen");
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Onbekende fout");
    } finally {
      setLoading(false);
    }
  }, [documentId, filterType, commentPage]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
        {error}
      </div>
    );
  }

  if (!data || data.total === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
        <MessageSquare className="h-8 w-8" />
        <p className="text-sm">Nog geen feedback ontvangen</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        {Object.entries(FEEDBACK_TYPE_LABELS).map(([key, { label, icon, color }]) => {
          const count = data.sections.reduce(
            (sum, s) => sum + (s.counts[key as keyof FeedbackCounts] || 0),
            0
          );
          return (
            <div
              key={key}
              className="flex flex-col items-center gap-1 rounded-lg border p-3"
            >
              <span className={color}>{icon}</span>
              <span className="text-lg font-semibold">{count}</span>
              <span className="text-xs text-muted-foreground">{label}</span>
            </div>
          );
        })}
      </div>

      {/* Per-section breakdown */}
      <div>
        <h3 className="mb-3 text-sm font-semibold">Feedback per sectie</h3>
        <div className="flex flex-col gap-3">
          {data.sections.map((section, i) => (
            <div key={i} className="rounded-lg border p-3">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-medium">
                    {SECTION_TYPE_LABELS[section.sectionType] || section.sectionType}
                  </span>
                  <span className="text-sm font-medium">
                    {getSectionLabel(section)}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {section.total} feedback
                </span>
              </div>
              <FeedbackBar counts={section.counts} total={section.total} />
              <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                {Object.entries(section.counts).map(
                  ([key, count]) =>
                    count > 0 && (
                      <span key={key} className="flex items-center gap-1">
                        <span className={FEEDBACK_TYPE_LABELS[key]?.color}>
                          {FEEDBACK_TYPE_LABELS[key]?.icon}
                        </span>
                        {count} {FEEDBACK_TYPE_LABELS[key]?.label?.toLowerCase()}
                      </span>
                    )
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Comments */}
      {data.totalComments > 0 && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold">
              Opmerkingen ({data.totalComments})
            </h3>
            <div className="flex items-center gap-1">
              <Filter className="h-3.5 w-3.5 text-muted-foreground" />
              <select
                className="rounded border bg-background px-2 py-1 text-xs"
                value={filterType || ""}
                onChange={(e) => {
                  setFilterType(e.target.value || null);
                  setCommentPage(1);
                }}
              >
                <option value="">Alle types</option>
                {Object.entries(FEEDBACK_TYPE_LABELS).map(([key, { label }]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            {data.comments.map((c) => (
              <div
                key={c._id}
                className="rounded-lg border p-3 text-sm"
              >
                <div className="mb-1.5 flex items-center gap-2">
                  <span
                    className={`flex items-center gap-1 text-xs ${
                      FEEDBACK_TYPE_LABELS[c.feedbackType]?.color || ""
                    }`}
                  >
                    {FEEDBACK_TYPE_LABELS[c.feedbackType]?.icon}
                    {FEEDBACK_TYPE_LABELS[c.feedbackType]?.label}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {SECTION_TYPE_LABELS[c.sectionType] || c.sectionType}
                    {c.sectionTitle ? ` - ${c.sectionTitle}` : ""}
                  </span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {new Date(c.createdAt).toLocaleDateString("nl-NL")}
                  </span>
                </div>
                <p className="text-muted-foreground">{c.comment}</p>
              </div>
            ))}
          </div>

          {data.totalPages > 1 && (
            <div className="mt-3 flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={commentPage <= 1}
                onClick={() => setCommentPage((p) => p - 1)}
              >
                Vorige
              </Button>
              <span className="text-xs text-muted-foreground">
                {commentPage} / {data.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={commentPage >= data.totalPages}
                onClick={() => setCommentPage((p) => p + 1)}
              >
                Volgende
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

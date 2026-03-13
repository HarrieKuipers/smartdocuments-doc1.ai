"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  X,
  Send,
  MessageSquare,
  Reply,
  Loader2,
  CheckCircle,
} from "lucide-react";

interface PublicAnnotation {
  _id: string;
  sectionType: string;
  sectionIndex?: number;
  authorName: string;
  content: string;
  parentId?: string;
  resolved: boolean;
  createdAt: string;
}

interface AnnotationPanelProps {
  shortId: string;
  sectionType: string;
  sectionIndex?: number;
  sectionTitle: string;
  brandPrimary: string;
  sessionId: string;
  onClose: () => void;
  onAnnotationCountChange?: (count: number) => void;
}

export default function AnnotationPanel({
  shortId,
  sectionType,
  sectionIndex,
  sectionTitle,
  brandPrimary,
  sessionId,
  onClose,
  onAnnotationCountChange,
}: AnnotationPanelProps) {
  const [annotations, setAnnotations] = useState<PublicAnnotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchAnnotations = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        sectionType,
        ...(sectionIndex !== undefined && { sectionIndex: String(sectionIndex) }),
      });
      const res = await fetch(
        `/api/reader/${shortId}/annotations?${params}`
      );
      if (!res.ok) return;
      const { data } = await res.json();
      setAnnotations(data.annotations || []);
      const topLevel = (data.annotations || []).filter(
        (a: PublicAnnotation) => !a.parentId
      );
      onAnnotationCountChange?.(topLevel.length);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [shortId, sectionType, sectionIndex, onAnnotationCountChange]);

  useEffect(() => {
    fetchAnnotations();
  }, [fetchAnnotations]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/reader/${shortId}/annotations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sectionType,
          sectionIndex,
          content: content.trim(),
          authorName: authorName.trim() || undefined,
          parentId: replyingTo || undefined,
          sessionId,
        }),
      });

      if (res.ok) {
        setContent("");
        setReplyingTo(null);
        await fetchAnnotations();
      }
    } catch {
      // ignore
    } finally {
      setSubmitting(false);
    }
  }

  // Group annotations: top-level + their replies
  const topLevel = annotations.filter((a) => !a.parentId);
  const replies = annotations.filter((a) => a.parentId);
  const repliesByParent = new Map<string, PublicAnnotation[]>();
  replies.forEach((r) => {
    const key = r.parentId!;
    if (!repliesByParent.has(key)) repliesByParent.set(key, []);
    repliesByParent.get(key)!.push(r);
  });

  return (
    <div className="rounded-xl border bg-white shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4" style={{ color: brandPrimary }} />
          <span className="text-sm font-semibold">
            Reacties op {sectionTitle}
          </span>
          {topLevel.length > 0 && (
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
              {topLevel.length}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1 hover:bg-gray-100"
        >
          <X className="h-4 w-4 text-gray-400" />
        </button>
      </div>

      {/* Annotations list */}
      <div className="max-h-80 overflow-y-auto px-4 py-3">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
          </div>
        ) : topLevel.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Nog geen reacties. Wees de eerste!
          </p>
        ) : (
          <div className="space-y-3">
            {topLevel.map((a) => (
              <div key={a._id}>
                <div className={`rounded-lg p-3 ${a.resolved ? "bg-green-50" : "bg-gray-50"}`}>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-700">
                      {a.authorName}
                    </span>
                    <div className="flex items-center gap-2">
                      {a.resolved && (
                        <CheckCircle className="h-3 w-3 text-green-500" />
                      )}
                      <span className="text-xs text-gray-400">
                        {new Date(a.createdAt).toLocaleDateString("nl-NL", {
                          day: "numeric",
                          month: "short",
                        })}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600">{a.content}</p>
                  <button
                    type="button"
                    onClick={() =>
                      setReplyingTo(replyingTo === a._id ? null : a._id)
                    }
                    className="mt-1 flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600"
                  >
                    <Reply className="h-3 w-3" />
                    Reageer
                  </button>
                </div>

                {/* Replies */}
                {repliesByParent.get(a._id)?.map((reply) => (
                  <div
                    key={reply._id}
                    className="ml-4 mt-1 rounded-lg bg-gray-50/50 p-3 border-l-2"
                    style={{ borderLeftColor: `${brandPrimary}40` }}
                  >
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-xs font-medium text-gray-700">
                        {reply.authorName}
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(reply.createdAt).toLocaleDateString("nl-NL", {
                          day: "numeric",
                          month: "short",
                        })}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">{reply.content}</p>
                  </div>
                ))}

                {/* Reply form */}
                {replyingTo === a._id && (
                  <form
                    onSubmit={handleSubmit}
                    className="ml-4 mt-2 flex gap-2"
                  >
                    <Input
                      placeholder="Reageer..."
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      className="text-sm"
                      autoFocus
                    />
                    <Button
                      type="submit"
                      size="sm"
                      disabled={submitting || !content.trim()}
                      style={{ backgroundColor: brandPrimary }}
                    >
                      {submitting ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Send className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </form>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New annotation form */}
      {!replyingTo && (
        <form onSubmit={handleSubmit} className="border-t px-4 py-3">
          <div className="mb-2 flex gap-2">
            <Input
              placeholder="Je naam (optioneel)"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              className="max-w-[140px] text-sm"
            />
            <Input
              placeholder="Schrijf een reactie..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="text-sm"
            />
            <Button
              type="submit"
              size="sm"
              disabled={submitting || !content.trim()}
              style={{ backgroundColor: brandPrimary }}
            >
              {submitting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

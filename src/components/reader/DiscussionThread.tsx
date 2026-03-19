"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  Send,
  Loader2,
  ThumbsUp,
  Pin,
  CheckCircle,
  Lock,
  Reply,
  Shield,
} from "lucide-react";

interface DiscussionData {
  _id: string;
  authorName: string;
  title: string;
  content: string;
  category: string;
  referencedSection?: {
    sectionType: string;
    sectionIndex?: number;
    quote?: string;
  };
  upvotes: number;
  upvotedBy: string[];
  replyCount: number;
  isPinned: boolean;
  isClosed: boolean;
  isResolved: boolean;
  lastActivityAt: string;
  createdAt: string;
}

interface ReplyData {
  _id: string;
  authorName: string;
  content: string;
  parentReplyId?: string;
  upvotes: number;
  isDocumentOwner: boolean;
  createdAt: string;
}

interface CommunityStrings {
  backToDiscussions: string;
  replyPlaceholder: string;
  submit: string;
  pinned: string;
  closed: string;
  resolved: string;
  documentAuthor: string;
  referencedSection: string;
  loginRequired: string;
  upvote: string;
  replies: (n: number) => string;
  categoryQuestion: string;
  categoryFeedback: string;
  categoryIdea: string;
  categoryDiscussion: string;
}

interface DiscussionThreadProps {
  shortId: string;
  discussion: DiscussionData;
  brandPrimary: string;
  strings: CommunityStrings;
  userId?: string;
  onBack: () => void;
}

const CATEGORY_LABELS: Record<string, keyof CommunityStrings> = {
  vraag: "categoryQuestion",
  feedback: "categoryFeedback",
  idee: "categoryIdea",
  discussie: "categoryDiscussion",
};

export default function DiscussionThread({
  shortId,
  discussion,
  brandPrimary,
  strings,
  userId,
  onBack,
}: DiscussionThreadProps) {
  const [replies, setReplies] = useState<ReplyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [upvotes, setUpvotes] = useState(discussion.upvotes);
  const [hasUpvoted, setHasUpvoted] = useState(
    userId ? discussion.upvotedBy.includes(userId) : false
  );

  const fetchReplies = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/reader/${shortId}/discussions/${discussion._id}/replies`
      );
      if (!res.ok) return;
      const { data } = await res.json();
      setReplies(data.replies || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [shortId, discussion._id]);

  useEffect(() => {
    fetchReplies();
  }, [fetchReplies]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim() || !userId) return;

    setSubmitting(true);
    try {
      const res = await fetch(
        `/api/reader/${shortId}/discussions/${discussion._id}/replies`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: content.trim(),
            parentReplyId: replyingTo || undefined,
          }),
        }
      );

      if (res.ok) {
        setContent("");
        setReplyingTo(null);
        await fetchReplies();
      }
    } catch {
      // ignore
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpvote() {
    if (!userId) return;
    try {
      const res = await fetch(
        `/api/reader/${shortId}/discussions/${discussion._id}/upvote`,
        { method: "POST" }
      );
      if (!res.ok) return;
      const { data } = await res.json();
      setUpvotes(data.upvotes);
      setHasUpvoted(data.hasUpvoted);
    } catch {
      // ignore
    }
  }

  const categoryKey = CATEGORY_LABELS[discussion.category] || "categoryDiscussion";
  const categoryLabel = strings[categoryKey] as string;

  // Group replies: top-level + nested
  const topLevelReplies = replies.filter((r) => !r.parentReplyId);
  const nestedReplies = replies.filter((r) => r.parentReplyId);
  const nestedByParent = new Map<string, ReplyData[]>();
  nestedReplies.forEach((r) => {
    const key = r.parentReplyId!;
    if (!nestedByParent.has(key)) nestedByParent.set(key, []);
    nestedByParent.get(key)!.push(r);
  });

  return (
    <div>
      {/* Back button */}
      <button
        type="button"
        onClick={onBack}
        className="mb-4 flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" />
        {strings.backToDiscussions}
      </button>

      {/* Discussion header */}
      <div className="mb-4 rounded-xl border bg-white p-5">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span
            className="rounded-full px-2.5 py-0.5 text-xs font-medium"
            style={{ backgroundColor: `${brandPrimary}15`, color: brandPrimary }}
          >
            {categoryLabel}
          </span>
          {discussion.isPinned && (
            <span className="flex items-center gap-1 text-xs text-amber-600">
              <Pin className="h-3 w-3" />
              {strings.pinned}
            </span>
          )}
          {discussion.isResolved && (
            <span className="flex items-center gap-1 text-xs text-green-600">
              <CheckCircle className="h-3 w-3" />
              {strings.resolved}
            </span>
          )}
          {discussion.isClosed && (
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <Lock className="h-3 w-3" />
              {strings.closed}
            </span>
          )}
        </div>

        <h3 className="mb-2 text-lg font-semibold text-gray-900">
          {discussion.title}
        </h3>

        <p className="mb-3 whitespace-pre-wrap text-sm leading-relaxed text-gray-600">
          {discussion.content}
        </p>

        {/* Referenced section quote */}
        {discussion.referencedSection?.quote && (
          <div
            className="mb-3 rounded-lg border-l-3 bg-gray-50 px-4 py-3 text-sm text-gray-500 italic"
            style={{ borderLeftColor: brandPrimary }}
          >
            <span className="mb-1 block text-xs font-medium not-italic" style={{ color: brandPrimary }}>
              {strings.referencedSection}
            </span>
            &ldquo;{discussion.referencedSection.quote}&rdquo;
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-xs text-gray-400">
            <span className="font-medium text-gray-600">{discussion.authorName}</span>
            <span>
              {new Date(discussion.createdAt).toLocaleDateString("nl-NL", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </span>
          </div>

          {userId && (
            <button
              type="button"
              onClick={handleUpvote}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                hasUpvoted
                  ? "text-white"
                  : "text-gray-500 hover:bg-gray-100"
              }`}
              style={hasUpvoted ? { backgroundColor: brandPrimary } : undefined}
            >
              <ThumbsUp className="h-3.5 w-3.5" />
              {upvotes}
            </button>
          )}
        </div>
      </div>

      {/* Replies */}
      <div className="mb-4">
        <h4 className="mb-3 text-sm font-medium text-gray-700">
          {strings.replies(replies.length)}
        </h4>

        {loading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
          </div>
        ) : topLevelReplies.length === 0 ? (
          <p className="py-4 text-center text-sm text-gray-400">
            Nog geen reacties.
          </p>
        ) : (
          <div className="space-y-2">
            {topLevelReplies.map((reply) => (
              <div key={reply._id}>
                <div className="rounded-xl border bg-white p-4">
                  <div className="mb-1.5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-700">
                        {reply.authorName}
                      </span>
                      {reply.isDocumentOwner && (
                        <span
                          className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold text-white"
                          style={{ backgroundColor: brandPrimary }}
                        >
                          <Shield className="h-2.5 w-2.5" />
                          {strings.documentAuthor}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-gray-400">
                      {new Date(reply.createdAt).toLocaleDateString("nl-NL", {
                        day: "numeric",
                        month: "short",
                      })}
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-600">
                    {reply.content}
                  </p>
                  {userId && !discussion.isClosed && (
                    <button
                      type="button"
                      onClick={() =>
                        setReplyingTo(replyingTo === reply._id ? null : reply._id)
                      }
                      className="mt-2 flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600"
                    >
                      <Reply className="h-3 w-3" />
                      Reageer
                    </button>
                  )}
                </div>

                {/* Nested replies */}
                {nestedByParent.get(reply._id)?.map((nested) => (
                  <div
                    key={nested._id}
                    className="ml-6 mt-1 rounded-xl border bg-white/80 p-4 border-l-2"
                    style={{ borderLeftColor: `${brandPrimary}40` }}
                  >
                    <div className="mb-1.5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-700">
                          {nested.authorName}
                        </span>
                        {nested.isDocumentOwner && (
                          <span
                            className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold text-white"
                            style={{ backgroundColor: brandPrimary }}
                          >
                            <Shield className="h-2.5 w-2.5" />
                            {strings.documentAuthor}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-400">
                        {new Date(nested.createdAt).toLocaleDateString("nl-NL", {
                          day: "numeric",
                          month: "short",
                        })}
                      </span>
                    </div>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-600">
                      {nested.content}
                    </p>
                  </div>
                ))}

                {/* Inline reply form */}
                {replyingTo === reply._id && userId && (
                  <form onSubmit={handleSubmit} className="ml-6 mt-2 flex gap-2">
                    <Input
                      placeholder={strings.replyPlaceholder}
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

      {/* New reply form (top-level) */}
      {userId && !discussion.isClosed && !replyingTo && (
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            placeholder={strings.replyPlaceholder}
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
        </form>
      )}
    </div>
  );
}

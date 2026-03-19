"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  MessageSquare,
  Plus,
  Loader2,
  ThumbsUp,
  Pin,
  CheckCircle,
  Lock,
  HelpCircle,
  Lightbulb,
  MessageCircle,
  Send as SendIcon,
} from "lucide-react";
import CommunityAuthGate from "./CommunityAuthGate";
import DiscussionThread from "./DiscussionThread";

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

interface CommunityStrings {
  discussionsTab: string;
  newDiscussion: string;
  startDiscussion: string;
  titlePlaceholder: string;
  contentPlaceholder: string;
  categoryQuestion: string;
  categoryFeedback: string;
  categoryIdea: string;
  categoryDiscussion: string;
  submit: string;
  cancel: string;
  replies: (n: number) => string;
  noDiscussions: string;
  loginRequired: string;
  loginButton: string;
  registerButton: string;
  replyPlaceholder: string;
  sortRecent: string;
  sortPopular: string;
  pinned: string;
  closed: string;
  resolved: string;
  documentAuthor: string;
  backToDiscussions: string;
  referencedSection: string;
  registerName: string;
  registerEmail: string;
  registerPassword: string;
  registerSubmit: string;
  registerTitle: string;
  registerSubtitle: string;
  loginTitle: string;
  loginSubtitle: string;
  loginEmail: string;
  loginPassword: string;
  loginSubmit: string;
  orRegister: string;
  orLogin: string;
  upvote: string;
}

interface DiscussionPanelProps {
  shortId: string;
  brandPrimary: string;
  strings: CommunityStrings;
}

const CATEGORY_OPTIONS = [
  { value: "vraag", icon: HelpCircle },
  { value: "feedback", icon: MessageCircle },
  { value: "idee", icon: Lightbulb },
  { value: "discussie", icon: MessageSquare },
] as const;

const CATEGORY_LABEL_KEYS: Record<string, keyof CommunityStrings> = {
  vraag: "categoryQuestion",
  feedback: "categoryFeedback",
  idee: "categoryIdea",
  discussie: "categoryDiscussion",
};

export default function DiscussionPanel({
  shortId,
  brandPrimary,
  strings,
}: DiscussionPanelProps) {
  const { data: session, update: updateSession } = useSession();
  const [discussions, setDiscussions] = useState<DiscussionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<"recent" | "popular">("recent");
  const [showForm, setShowForm] = useState(false);
  const [activeDiscussion, setActiveDiscussion] = useState<DiscussionData | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState<string>("vraag");
  const [submitting, setSubmitting] = useState(false);

  const userId = session?.user?.id;

  const fetchDiscussions = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/reader/${shortId}/discussions?sort=${sort}`
      );
      if (!res.ok) return;
      const { data } = await res.json();
      setDiscussions(data.discussions || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [shortId, sort]);

  useEffect(() => {
    fetchDiscussions();
  }, [fetchDiscussions]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !content.trim() || !userId) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/reader/${shortId}/discussions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim(),
          category,
        }),
      });

      if (res.ok) {
        setTitle("");
        setContent("");
        setCategory("vraag");
        setShowForm(false);
        await fetchDiscussions();
      }
    } catch {
      // ignore
    } finally {
      setSubmitting(false);
    }
  }

  function handleAuthenticated() {
    updateSession();
  }

  function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}u`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d`;
    return `${Math.floor(days / 30)}ma`;
  }

  // Thread view
  if (activeDiscussion) {
    return (
      <DiscussionThread
        shortId={shortId}
        discussion={activeDiscussion}
        brandPrimary={brandPrimary}
        strings={strings}
        userId={userId}
        onBack={() => {
          setActiveDiscussion(null);
          fetchDiscussions();
        }}
      />
    );
  }

  return (
    <div>
      {/* Sort + New Discussion button */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex rounded-lg border bg-white p-0.5">
          <button
            type="button"
            onClick={() => setSort("recent")}
            className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
              sort === "recent" ? "text-white" : "text-gray-500 hover:text-gray-700"
            }`}
            style={sort === "recent" ? { backgroundColor: brandPrimary } : undefined}
          >
            {strings.sortRecent}
          </button>
          <button
            type="button"
            onClick={() => setSort("popular")}
            className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
              sort === "popular" ? "text-white" : "text-gray-500 hover:text-gray-700"
            }`}
            style={sort === "popular" ? { backgroundColor: brandPrimary } : undefined}
          >
            {strings.sortPopular}
          </button>
        </div>

        {userId && (
          <Button
            size="sm"
            onClick={() => setShowForm(!showForm)}
            style={{ backgroundColor: brandPrimary }}
            className="gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            {strings.newDiscussion}
          </Button>
        )}
      </div>

      {/* Auth gate for non-authenticated users */}
      {!userId && !showForm && (
        <CommunityAuthGate
          strings={strings}
          brandPrimary={brandPrimary}
          onAuthenticated={handleAuthenticated}
        />
      )}

      {/* New discussion form */}
      {showForm && userId && (
        <form onSubmit={handleSubmit} className="mb-4 rounded-xl border bg-white p-4">
          <h4 className="mb-3 text-sm font-semibold text-gray-900">
            {strings.startDiscussion}
          </h4>

          {/* Category selector */}
          <div className="mb-3 flex gap-1.5">
            {CATEGORY_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const label = strings[CATEGORY_LABEL_KEYS[opt.value]] as string;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setCategory(opt.value)}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                    category === opt.value ? "text-white" : "text-gray-500 hover:bg-gray-100"
                  }`}
                  style={
                    category === opt.value ? { backgroundColor: brandPrimary } : undefined
                  }
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              );
            })}
          </div>

          <Input
            placeholder={strings.titlePlaceholder}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mb-2 text-sm"
            maxLength={200}
          />
          <textarea
            placeholder={strings.contentPlaceholder}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="mb-3 w-full rounded-lg border bg-transparent px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-1"
            style={{ "--tw-ring-color": brandPrimary } as React.CSSProperties}
            rows={3}
            maxLength={5000}
          />

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowForm(false)}
            >
              {strings.cancel}
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={submitting || !title.trim() || !content.trim()}
              style={{ backgroundColor: brandPrimary }}
              className="gap-1.5"
            >
              {submitting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <SendIcon className="h-3.5 w-3.5" />
              )}
              {strings.submit}
            </Button>
          </div>
        </form>
      )}

      {/* Discussion list */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
        </div>
      ) : discussions.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-400">
          {strings.noDiscussions}
        </p>
      ) : (
        <div className="space-y-2">
          {discussions.map((d) => {
            const catKey = CATEGORY_LABEL_KEYS[d.category] || "categoryDiscussion";
            const catLabel = strings[catKey] as string;

            return (
              <button
                key={d._id}
                type="button"
                onClick={() => setActiveDiscussion(d)}
                className="w-full rounded-xl border bg-white p-4 text-left transition-all hover:border-gray-200 hover:shadow-sm"
              >
                <div className="mb-1.5 flex flex-wrap items-center gap-2">
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                    style={{
                      backgroundColor: `${brandPrimary}15`,
                      color: brandPrimary,
                    }}
                  >
                    {catLabel}
                  </span>
                  {d.isPinned && (
                    <Pin className="h-3 w-3 text-amber-500" />
                  )}
                  {d.isResolved && (
                    <CheckCircle className="h-3 w-3 text-green-500" />
                  )}
                  {d.isClosed && (
                    <Lock className="h-3 w-3 text-gray-400" />
                  )}
                </div>

                <h4 className="mb-1 text-sm font-semibold text-gray-900 leading-snug">
                  {d.title}
                </h4>
                <p className="mb-2 line-clamp-2 text-xs leading-relaxed text-gray-500">
                  {d.content}
                </p>

                <div className="flex items-center gap-4 text-xs text-gray-400">
                  <span className="font-medium text-gray-500">{d.authorName}</span>
                  <span>{timeAgo(d.lastActivityAt)}</span>
                  <span className="flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" />
                    {d.replyCount}
                  </span>
                  {d.upvotes > 0 && (
                    <span className="flex items-center gap-1">
                      <ThumbsUp className="h-3 w-3" />
                      {d.upvotes}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

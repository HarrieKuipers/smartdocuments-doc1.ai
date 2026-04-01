"use client";

import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { nanoid } from "nanoid";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  FileText,
  FolderOpen,
  Search,
  X,
  ExternalLink,
  Send,
  Loader2,
  ArrowLeft,
  MessageSquare,
  Table2,
  BarChart3,
  GitBranch,
  ChevronDown,
} from "lucide-react";
import ReactMarkdown from "react-markdown";

interface CollectionDocument {
  _id: string;
  shortId: string;
  title: string;
  authors: string[];
  description?: string;
  coverImageUrl?: string;
  customCoverUrl?: string;
  tags: string[];
}

interface SourceDocument {
  shortId: string;
  title: string;
}

interface ChunkSource {
  page: number | null;
  section: string;
  score: number;
  quote?: string;
  documentTitle?: string;
  documentShortId?: string;
  contentType?: string;
  pageImageUrl?: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  sourceDocuments?: SourceDocument[];
  sources?: ChunkSource[];
}

interface CollectionData {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  templateConfig?: { primary: string; primaryLight: string };
  chatIntro?: string;
  chatPlaceholder?: string;
  chatSuggestions?: string[];
  chatSuggestionsCache?: {
    question: string;
    answer: string;
    sourceDocuments?: SourceDocument[];
  }[];
  organization: {
    name: string;
    slug: string;
    logo?: string;
    brandColors: { primary: string };
  };
  documents: CollectionDocument[];
}

type EmbedMode = "chat" | "summary" | "full";

function extractConfidence(text: string) {
  const match = text.match(/\[(?:Betrouwbaarheid|Confidence):\s*(HOOG|MIDDEL|LAAG|HIGH|MEDIUM|LOW)\]/i);
  return {
    cleaned: match ? text.replace(match[0], "").trim() : text,
    confidence: match ? match[1].toUpperCase() as "HOOG" | "MIDDEL" | "LAAG" | "HIGH" | "MEDIUM" | "LOW" : null,
  };
}

function EmbedContentTypeIcon({ type, className }: { type?: string; className?: string }) {
  switch (type) {
    case "table": return <Table2 className={className} aria-hidden="true" />;
    case "chart": return <BarChart3 className={className} aria-hidden="true" />;
    case "diagram": return <GitBranch className={className} aria-hidden="true" />;
    default: return <FileText className={className} aria-hidden="true" />;
  }
}

export default function EmbedCollectionPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const [collection, setCollection] = useState<CollectionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Query params
  const mode = (searchParams.get("mode") || "full") as EmbedMode;
  const theme = searchParams.get("theme") || "light";
  const whitelabel = searchParams.get("whitelabel") === "true";
  const colorOverride = searchParams.get("color");

  // Chat state
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [expandedQuotes, setExpandedQuotes] = useState<Set<string>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);

  // Document search
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCollection() {
      try {
        const res = await fetch(`/api/reader/collections/${params.slug}`);
        if (!res.ok) {
          setError("Collectie niet gevonden.");
          setLoading(false);
          return;
        }
        const { data } = await res.json();
        setCollection(data);
      } catch {
        setError("Kon collectie niet laden.");
      } finally {
        setLoading(false);
      }
    }
    fetchCollection();
  }, [params.slug]);

  // Scroll to last user message
  useEffect(() => {
    if (scrollRef.current) {
      const msgs = scrollRef.current.querySelectorAll("[data-msg-role='user']");
      const lastUserMsg = msgs[msgs.length - 1] as HTMLElement | undefined;
      if (lastUserMsg) {
        scrollRef.current.scrollTo({
          top: Math.max(0, lastUserMsg.offsetTop - 16),
          behavior: "smooth",
        });
      } else {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }
  }, [messages]);

  const sendMessage = useCallback(
    async (messageText: string) => {
      if (!messageText.trim() || chatLoading || !collection) return;

      setMessages((prev) => [...prev, { role: "user", content: messageText }]);
      setChatLoading(true);

      try {
        const res = await fetch(
          `/api/reader/collections/${collection.slug}/chat`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              message: messageText,
              history: messages.slice(-10),
            }),
          }
        );

        if (!res.ok) throw new Error();
        const { data } = await res.json();

        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: data.response,
            sourceDocuments: data.sourceDocuments,
            sources: data.sources,
          },
        ]);
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content:
              "Er ging iets mis bij het verwerken van je vraag. Probeer het opnieuw.",
          },
        ]);
      } finally {
        setChatLoading(false);
      }
    },
    [collection, chatLoading, messages]
  );

  // Cached answer lookup
  const cacheMap = useMemo(() => {
    const map = new Map<
      string,
      { answer: string; sourceDocuments?: SourceDocument[] }
    >();
    if (collection?.chatSuggestionsCache) {
      for (const c of collection.chatSuggestionsCache) {
        map.set(c.question, {
          answer: c.answer,
          sourceDocuments: c.sourceDocuments,
        });
      }
    }
    return map;
  }, [collection?.chatSuggestionsCache]);

  function handleSuggestionClick(question: string) {
    const cached = cacheMap.get(question);
    if (cached) {
      setMessages((prev) => [
        ...prev,
        { role: "user", content: question },
        {
          role: "assistant",
          content: cached.answer,
          sourceDocuments: cached.sourceDocuments,
        },
      ]);
    } else {
      sendMessage(question);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || chatLoading) return;
    const text = input.trim();
    setInput("");
    sendMessage(text);
  }

  // Filter documents
  const allTags = useMemo(() => {
    if (!collection) return [];
    const tagSet = new Set<string>();
    collection.documents.forEach((doc) =>
      doc.tags?.forEach((tag) => tagSet.add(tag))
    );
    return Array.from(tagSet).sort();
  }, [collection]);

  const filteredDocs = useMemo(() => {
    if (!collection) return [];
    let docs = [...collection.documents];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      docs = docs.filter(
        (doc) =>
          doc.title.toLowerCase().includes(q) ||
          doc.description?.toLowerCase().includes(q) ||
          doc.authors?.some((a) => a.toLowerCase().includes(q))
      );
    }
    if (selectedTag) {
      docs = docs.filter((doc) => doc.tags?.includes(selectedTag));
    }
    docs.sort((a, b) => a.title.localeCompare(b.title, "nl"));
    return docs;
  }, [collection, searchQuery, selectedTag]);

  // Theme colors
  const isDark = theme === "dark";
  const bgColor = isDark ? "#1a1a2e" : "#ffffff";
  const textColor = isDark ? "#e0e0e0" : "#374151";
  const headingColor = isDark ? "#f5f5f5" : "#111827";
  const mutedColor = isDark ? "#9ca3af" : "#6b7280";
  const cardBg = isDark ? "#16213e" : "#f9fafb";
  const borderColor = isDark ? "#2d3748" : "#e5e7eb";
  const inputBg = isDark ? "#1e293b" : "#ffffff";

  if (loading) {
    return (
      <div
        className="p-4 md:p-6"
        style={{ backgroundColor: bgColor, minHeight: "100vh" }}
      >
        <Skeleton className="mb-3 h-6 w-3/4" />
        <Skeleton className="mb-2 h-4 w-full" />
        <Skeleton className="mb-2 h-4 w-full" />
        <Skeleton className="mt-6 mb-3 h-6 w-1/2" />
        <Skeleton className="mb-2 h-10 w-full" />
        <Skeleton className="mb-2 h-10 w-full" />
      </div>
    );
  }

  if (error || !collection) {
    return (
      <div
        className="flex min-h-screen items-center justify-center p-6"
        style={{ backgroundColor: bgColor }}
      >
        <div className="text-center">
          <FolderOpen
            className="mx-auto mb-3 h-10 w-10"
            style={{ color: mutedColor }}
          />
          <p style={{ color: textColor }} className="text-sm font-medium">
            {error || "Collectie niet gevonden."}
          </p>
        </div>
      </div>
    );
  }

  const brandPrimary =
    colorOverride ||
    collection.templateConfig?.primary ||
    collection.organization?.brandColors?.primary ||
    "#0062EB";
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://doc1.ai";
  const collectionUrl = `${siteUrl}/c/${collection.slug}`;
  const suggestions =
    collection.chatSuggestions && collection.chatSuggestions.length > 0
      ? collection.chatSuggestions
      : [
          "Wat zijn de belangrijkste onderwerpen?",
          "Geef een samenvatting van de documenten",
          "Welke documenten gaan over dit onderwerp?",
        ];
  const introText =
    collection.chatIntro ||
    `Stel een vraag over de ${collection.documents.length} documenten in deze collectie.`;
  const placeholderText =
    collection.chatPlaceholder || "Stel een vraag over de documenten...";

  const showChat = mode === "chat" || mode === "full";
  const showDocuments = mode === "summary" || mode === "full";

  return (
    <div
      className="embed-collection"
      style={{
        backgroundColor: bgColor,
        color: textColor,
        minHeight: "100vh",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <div
        className="px-4 py-3 md:px-6"
        style={{
          borderBottom: `1px solid ${borderColor}`,
        }}
      >
        <h1
          className="text-lg font-bold"
          style={{ color: headingColor }}
        >
          {collection.name}
        </h1>
        {collection.description && (
          <p className="mt-0.5 text-sm" style={{ color: mutedColor }}>
            {collection.description}
          </p>
        )}
      </div>

      <div className="flex flex-1 flex-col overflow-hidden" style={{ minHeight: 0 }}>
        {/* Chat-only mode */}
        {mode === "chat" && (
          <div className="flex flex-1 flex-col overflow-hidden">
            {/* Chat messages */}
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-4 space-y-3"
            >
              {messages.length === 0 && (
                <div className="space-y-3">
                  <p
                    className="text-sm text-center"
                    style={{ color: mutedColor }}
                  >
                    {introText}
                  </p>
                  <div className="space-y-2">
                    {suggestions.map((q, i) => (
                      <button
                        key={i}
                        onClick={() => handleSuggestionClick(q)}
                        className="block w-full rounded-lg p-2.5 text-left text-sm transition-colors"
                        style={{
                          backgroundColor: cardBg,
                          border: `1px solid ${borderColor}`,
                          color: textColor,
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.borderColor = brandPrimary)
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.borderColor = borderColor)
                        }
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {messages.map((msg, i) => {
                const isAssistant = msg.role === "assistant";
                const { cleaned, confidence } = isAssistant ? extractConfidence(msg.content) : { cleaned: msg.content, confidence: null };
                const cleanedContent = isAssistant ? cleaned.replace(/\s*\[Document:\s*"[^"]*"\]/g, "") : msg.content;
                const pageImages = isAssistant && msg.sources
                  ? [...new Map(msg.sources.filter((s) => s.pageImageUrl).map((s) => [s.pageImageUrl, s])).values()]
                  : [];
                return (
                <div
                  key={i}
                  data-msg
                  data-msg-role={msg.role}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                      msg.role === "user" ? "text-white" : ""
                    }`}
                    style={
                      msg.role === "user"
                        ? { backgroundColor: brandPrimary }
                        : {
                            backgroundColor: cardBg,
                            border: `1px solid ${borderColor}`,
                            color: textColor,
                          }
                    }
                  >
                    {isAssistant ? (
                      <div>
                        <div className="prose prose-sm max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_p]:my-2 [&_ul]:my-2 [&_ol]:my-2 [&_li]:my-0.5 [&_strong]:font-semibold">
                          <ReactMarkdown>{cleanedContent}</ReactMarkdown>
                        </div>
                        {/* Page image thumbnails */}
                        {pageImages.length > 0 && (
                          <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                            {pageImages.map((s, si) => (
                              <button
                                key={si}
                                onClick={() => setLightboxUrl(s.pageImageUrl!)}
                                className="flex-shrink-0 overflow-hidden rounded-md transition-colors"
                                style={{ border: `1px solid ${borderColor}` }}
                                aria-label={`View page ${s.page || ""} image`}
                              >
                                <img
                                  src={s.pageImageUrl}
                                  alt={`Page ${s.page || ""}`}
                                  className="h-[100px] w-auto object-contain"
                                  style={{ backgroundColor: cardBg }}
                                />
                              </button>
                            ))}
                          </div>
                        )}
                        {/* Source badges */}
                        {msg.sources && msg.sources.length > 0 && (
                          <div className="mt-2 space-y-1" style={{ borderTop: `1px solid ${borderColor}`, paddingTop: "0.5rem" }}>
                            <div className="flex flex-wrap gap-1.5">
                              {msg.sources
                                .filter((s) => s.page || s.section)
                                .slice(0, 4)
                                .map((s, si) => {
                                  const quoteKey = `chat-${i}-${si}`;
                                  const isExpanded = expandedQuotes.has(quoteKey);
                                  const label = s.documentTitle
                                    ? `${s.documentTitle}${s.page ? ` · p. ${s.page}` : ""}${s.section ? ` · ${s.section.length > 20 ? s.section.slice(0, 20) + "…" : s.section}` : ""}`
                                    : `${s.page ? `p. ${s.page}` : ""}${s.page && s.section ? " · " : ""}${s.section ? (s.section.length > 30 ? s.section.slice(0, 30) + "…" : s.section) : ""}`;
                                  return (
                                    <span key={si} className="inline-flex flex-col">
                                      <span
                                        className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[0.65rem]"
                                        style={{ backgroundColor: cardBg, border: `1px solid ${borderColor}`, color: mutedColor }}
                                      >
                                        <EmbedContentTypeIcon type={s.contentType} className="h-2.5 w-2.5" />
                                        {label}
                                        {s.quote && (
                                          <button
                                            onClick={() => {
                                              setExpandedQuotes((prev) => {
                                                const next = new Set(prev);
                                                if (next.has(quoteKey)) next.delete(quoteKey);
                                                else next.add(quoteKey);
                                                return next;
                                              });
                                            }}
                                            className="ml-0.5 rounded p-0.5"
                                            aria-label="Toggle quote"
                                          >
                                            <ChevronDown className={`h-2.5 w-2.5 transition-transform ${isExpanded ? "rotate-180" : ""}`} aria-hidden="true" />
                                          </button>
                                        )}
                                      </span>
                                      {s.quote && isExpanded && (
                                        <span className="mt-0.5 ml-2 text-[0.6rem] italic leading-snug max-w-[260px]" style={{ color: mutedColor }}>
                                          &ldquo;{s.quote.length > 150 ? s.quote.slice(0, 150) + "…" : s.quote}&rdquo;
                                        </span>
                                      )}
                                    </span>
                                  );
                                })}
                            </div>
                            {confidence && (
                              <div className="mt-1">
                                <span className={`inline-block rounded-full px-2 py-0.5 text-[0.6rem] font-medium ${
                                  confidence === "HOOG" || confidence === "HIGH"
                                    ? "bg-green-100 text-green-700"
                                    : confidence === "MIDDEL" || confidence === "MEDIUM"
                                      ? "bg-amber-100 text-amber-700"
                                      : "bg-red-100 text-red-700"
                                }`}>
                                  {confidence === "HOOG" || confidence === "HIGH"
                                    ? "Hoge betrouwbaarheid"
                                    : confidence === "MIDDEL" || confidence === "MEDIUM"
                                      ? "Gemiddelde betrouwbaarheid"
                                      : "Lage betrouwbaarheid"}
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      msg.content
                    )}
                  </div>
                </div>
                );
              })}
              {chatLoading && (
                <div className="flex justify-start">
                  <div
                    className="flex items-center gap-2 rounded-2xl px-4 py-2.5"
                    style={{
                      backgroundColor: cardBg,
                      border: `1px solid ${borderColor}`,
                    }}
                  >
                    <Loader2
                      className="h-4 w-4 animate-spin"
                      style={{ color: mutedColor }}
                    />
                    <span className="text-sm" style={{ color: mutedColor }}>
                      Aan het typen...
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Chat input */}
            <form
              onSubmit={handleSubmit}
              className="p-3"
              style={{ borderTop: `1px solid ${borderColor}` }}
            >
              <div className="flex gap-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={placeholderText}
                  disabled={chatLoading}
                  className="flex-1 rounded-lg border px-3 py-2 text-sm outline-none transition-colors focus:ring-2"
                  style={{
                    backgroundColor: inputBg,
                    borderColor: borderColor,
                    color: textColor,
                    // @ts-expect-error CSS custom property
                    "--tw-ring-color": brandPrimary,
                  }}
                />
                <button
                  type="submit"
                  disabled={chatLoading || !input.trim()}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white transition-opacity disabled:opacity-50"
                  style={{ backgroundColor: brandPrimary }}
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Documents view (summary or full mode) */}
        {showDocuments && (
          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
            {/* Search */}
            {collection.documents.length > 3 && (
              <div className="space-y-3">
                <div className="relative">
                  <Search
                    className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
                    style={{ color: mutedColor }}
                  />
                  <input
                    placeholder="Zoek op titel of auteur..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-lg border py-2 pl-10 pr-8 text-sm outline-none transition-colors focus:ring-2"
                    style={{
                      backgroundColor: inputBg,
                      borderColor: borderColor,
                      color: textColor,
                    }}
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                      style={{ color: mutedColor }}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {allTags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      onClick={() => setSelectedTag(null)}
                      className="rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors"
                      style={
                        !selectedTag
                          ? {
                              backgroundColor: headingColor,
                              color: bgColor,
                            }
                          : {
                              backgroundColor: cardBg,
                              color: mutedColor,
                              border: `1px solid ${borderColor}`,
                            }
                      }
                    >
                      Alles
                    </button>
                    {allTags.map((tag) => (
                      <button
                        key={tag}
                        onClick={() =>
                          setSelectedTag(selectedTag === tag ? null : tag)
                        }
                        className="rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors"
                        style={
                          selectedTag === tag
                            ? {
                                backgroundColor: brandPrimary,
                                color: "#ffffff",
                              }
                            : {
                                backgroundColor: cardBg,
                                color: mutedColor,
                                border: `1px solid ${borderColor}`,
                              }
                        }
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Document list */}
            {filteredDocs.length === 0 ? (
              <div className="py-8 text-center">
                <FileText
                  className="mx-auto mb-3 h-8 w-8"
                  style={{ color: mutedColor }}
                />
                <p className="text-sm" style={{ color: mutedColor }}>
                  {searchQuery || selectedTag
                    ? "Geen documenten gevonden."
                    : "Geen documenten in deze collectie."}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredDocs.map((doc) => (
                  <a
                    key={doc._id}
                    href={`${siteUrl}/${doc.shortId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start gap-3 rounded-lg p-3 transition-colors"
                    style={{
                      backgroundColor: cardBg,
                      border: `1px solid ${borderColor}`,
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.borderColor = brandPrimary)
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.borderColor = borderColor)
                    }
                  >
                    {(doc.customCoverUrl || doc.coverImageUrl) ? (
                      <img
                        src={doc.customCoverUrl || doc.coverImageUrl}
                        alt=""
                        className="h-16 w-12 shrink-0 rounded object-cover"
                      />
                    ) : (
                      <div
                        className="flex h-16 w-12 shrink-0 items-center justify-center rounded"
                        style={{ backgroundColor: `${brandPrimary}10` }}
                      >
                        <FileText
                          className="h-5 w-5"
                          style={{ color: `${brandPrimary}60` }}
                        />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <h3
                        className="text-sm font-semibold leading-snug"
                        style={{ color: headingColor }}
                      >
                        {doc.title}
                      </h3>
                      {doc.description && (
                        <p
                          className="mt-0.5 text-xs line-clamp-2"
                          style={{ color: mutedColor }}
                        >
                          {doc.description}
                        </p>
                      )}
                      {doc.tags?.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {doc.tags.slice(0, 3).map((tag, i) => (
                            <span
                              key={i}
                              className="rounded px-1.5 py-0.5 text-[10px] font-medium"
                              style={{
                                backgroundColor: `${brandPrimary}12`,
                                color: brandPrimary,
                              }}
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <ExternalLink
                      className="mt-1 h-3.5 w-3.5 shrink-0"
                      style={{ color: mutedColor }}
                    />
                  </a>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Inline chat section in full mode */}
        {mode === "full" && collection.documents.length > 0 && (
          <div style={{ borderTop: `1px solid ${borderColor}` }}>
            <CollapsibleChat
              brandPrimary={brandPrimary}
              introText={introText}
              placeholderText={placeholderText}
              suggestions={suggestions}
              messages={messages}
              setMessages={setMessages}
              input={input}
              setInput={setInput}
              chatLoading={chatLoading}
              onSubmit={handleSubmit}
              onSuggestionClick={handleSuggestionClick}
              isDark={isDark}
              bgColor={bgColor}
              textColor={textColor}
              headingColor={headingColor}
              mutedColor={mutedColor}
              cardBg={cardBg}
              borderColor={borderColor}
              inputBg={inputBg}
              setLightboxUrl={setLightboxUrl}
              expandedQuotes={expandedQuotes}
              setExpandedQuotes={setExpandedQuotes}
            />
          </div>
        )}
      </div>

      {/* Footer */}
      {!whitelabel && (
        <div
          className="px-4 py-2.5 text-center"
          style={{ borderTop: `1px solid ${borderColor}` }}
        >
          <a
            href={collectionUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-medium no-underline transition-opacity hover:opacity-80"
            style={{ color: brandPrimary }}
          >
            Bekijk op doc1.ai
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      )}

      {/* Lightbox overlay */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => setLightboxUrl(null)}
          onKeyDown={(e) => { if (e.key === "Escape") setLightboxUrl(null); }}
          role="dialog"
          aria-label="Image preview"
          tabIndex={0}
        >
          <button
            onClick={() => setLightboxUrl(null)}
            className="absolute top-4 right-4 rounded-full bg-black/50 p-2 text-white hover:bg-black/70 transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
          <img
            src={lightboxUrl}
            alt="Page preview"
            className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}

// -- Collapsible chat for full mode --
function CollapsibleChat({
  brandPrimary,
  introText,
  placeholderText,
  suggestions,
  messages,
  setMessages,
  input,
  setInput,
  chatLoading,
  onSubmit,
  onSuggestionClick,
  isDark,
  bgColor,
  textColor,
  headingColor,
  mutedColor,
  cardBg,
  borderColor,
  inputBg,
  setLightboxUrl,
  expandedQuotes,
  setExpandedQuotes,
}: {
  brandPrimary: string;
  introText: string;
  placeholderText: string;
  suggestions: string[];
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  input: string;
  setInput: React.Dispatch<React.SetStateAction<string>>;
  chatLoading: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onSuggestionClick: (q: string) => void;
  isDark: boolean;
  bgColor: string;
  textColor: string;
  headingColor: string;
  mutedColor: string;
  cardBg: string;
  borderColor: string;
  inputBg: string;
  setLightboxUrl: (url: string | null) => void;
  expandedQuotes: Set<string>;
  setExpandedQuotes: React.Dispatch<React.SetStateAction<Set<string>>>;
}) {
  const [expanded, setExpanded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current && expanded) {
      const msgs = scrollRef.current.querySelectorAll(
        "[data-msg-role='user']"
      );
      const lastUserMsg = msgs[msgs.length - 1] as HTMLElement | undefined;
      if (lastUserMsg) {
        scrollRef.current.scrollTo({
          top: Math.max(0, lastUserMsg.offsetTop - 16),
          behavior: "smooth",
        });
      }
    }
  }, [messages, expanded]);

  return (
    <div>
      {/* Toggle bar */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 px-4 py-3 text-sm font-medium transition-colors"
        style={{ color: brandPrimary }}
      >
        <MessageSquare className="h-4 w-4" />
        {expanded ? "Chat verbergen" : "Stel een vraag over de documenten"}
        {messages.length > 0 && (
          <span
            className="rounded-full px-1.5 py-0.5 text-[10px] font-bold text-white"
            style={{ backgroundColor: brandPrimary }}
          >
            {messages.filter((m) => m.role === "user").length}
          </span>
        )}
      </button>

      {expanded && (
        <div className="flex flex-col" style={{ maxHeight: "400px" }}>
          {/* Messages */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-4 space-y-3"
            style={{ maxHeight: "320px" }}
          >
            {messages.length === 0 && (
              <div className="space-y-3">
                <p className="text-sm text-center" style={{ color: mutedColor }}>
                  {introText}
                </p>
                <div className="space-y-2">
                  {suggestions.map((q, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        onSuggestionClick(q);
                      }}
                      className="block w-full rounded-lg p-2.5 text-left text-sm transition-colors"
                      style={{
                        backgroundColor: cardBg,
                        border: `1px solid ${borderColor}`,
                        color: textColor,
                      }}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((msg, i) => {
              const isAssistant = msg.role === "assistant";
              const { cleaned, confidence } = isAssistant ? extractConfidence(msg.content) : { cleaned: msg.content, confidence: null };
              const cleanedContent = isAssistant ? cleaned.replace(/\s*\[Document:\s*"[^"]*"\]/g, "") : msg.content;
              const pageImages = isAssistant && msg.sources
                ? [...new Map(msg.sources.filter((s) => s.pageImageUrl).map((s) => [s.pageImageUrl, s])).values()]
                : [];
              return (
              <div
                key={i}
                data-msg
                data-msg-role={msg.role}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                    msg.role === "user" ? "text-white" : ""
                  }`}
                  style={
                    msg.role === "user"
                      ? { backgroundColor: brandPrimary }
                      : {
                          backgroundColor: cardBg,
                          border: `1px solid ${borderColor}`,
                          color: textColor,
                        }
                  }
                >
                  {isAssistant ? (
                    <div>
                      <div className="prose prose-sm max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_p]:my-2">
                        <ReactMarkdown>{cleanedContent}</ReactMarkdown>
                      </div>
                      {pageImages.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {pageImages.map((s, si) => {
                            const typeEmoji = s.contentType === "table" ? "📊" : s.contentType === "chart" ? "📈" : s.contentType === "diagram" ? "🔀" : s.contentType === "image-with-text" ? "🖼️" : "";
                            const typeLabel = s.contentType === "table" ? "Tabel" : s.contentType === "chart" ? "Grafiek" : s.contentType === "diagram" ? "Diagram" : s.contentType === "image-with-text" ? "Afbeelding" : "";
                            const caption = [
                              typeEmoji && typeLabel ? `${typeEmoji} ${typeLabel}` : null,
                              s.section ? s.section : null,
                              s.page ? `pagina ${s.page}` : null,
                            ].filter(Boolean).join(" · ");
                            return (
                              <button
                                key={si}
                                onClick={() => setLightboxUrl(s.pageImageUrl!)}
                                className="block w-full overflow-hidden rounded-lg shadow-sm transition-all text-left"
                                style={{ border: `1px solid ${borderColor}` }}
                                aria-label={`View page ${s.page || ""} image`}
                              >
                                <img
                                  src={s.pageImageUrl}
                                  alt={caption || `Page ${s.page || ""}`}
                                  className="w-full max-h-[200px] object-contain"
                                  style={{ backgroundColor: cardBg }}
                                />
                                {caption && (
                                  <div className="px-2.5 py-1.5" style={{ backgroundColor: cardBg, borderTop: `1px solid ${borderColor}` }}>
                                    <span className="text-[0.7rem] leading-snug" style={{ color: mutedColor }}>{caption}</span>
                                  </div>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}
                      {msg.sources && msg.sources.length > 0 && (
                        <div className="mt-2 space-y-1" style={{ borderTop: `1px solid ${borderColor}`, paddingTop: "0.5rem" }}>
                          <div className="flex flex-wrap gap-1.5">
                            {msg.sources
                              .filter((s) => s.page || s.section)
                              .slice(0, 4)
                              .map((s, si) => {
                                const quoteKey = `coll-${i}-${si}`;
                                const isExpanded = expandedQuotes.has(quoteKey);
                                const label = s.documentTitle
                                  ? `${s.documentTitle}${s.page ? ` · p. ${s.page}` : ""}${s.section ? ` · ${s.section.length > 20 ? s.section.slice(0, 20) + "…" : s.section}` : ""}`
                                  : `${s.page ? `p. ${s.page}` : ""}${s.page && s.section ? " · " : ""}${s.section ? (s.section.length > 30 ? s.section.slice(0, 30) + "…" : s.section) : ""}`;
                                return (
                                  <span key={si} className="inline-flex flex-col">
                                    <span
                                      className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[0.65rem]"
                                      style={{ backgroundColor: cardBg, border: `1px solid ${borderColor}`, color: mutedColor }}
                                    >
                                      <EmbedContentTypeIcon type={s.contentType} className="h-2.5 w-2.5" />
                                      {label}
                                      {s.quote && (
                                        <button
                                          onClick={() => {
                                            setExpandedQuotes((prev) => {
                                              const next = new Set(prev);
                                              if (next.has(quoteKey)) next.delete(quoteKey);
                                              else next.add(quoteKey);
                                              return next;
                                            });
                                          }}
                                          className="ml-0.5 rounded p-0.5"
                                          aria-label="Toggle quote"
                                        >
                                          <ChevronDown className={`h-2.5 w-2.5 transition-transform ${isExpanded ? "rotate-180" : ""}`} aria-hidden="true" />
                                        </button>
                                      )}
                                    </span>
                                    {s.quote && isExpanded && (
                                      <span className="mt-0.5 ml-2 text-[0.6rem] italic leading-snug max-w-[260px]" style={{ color: mutedColor }}>
                                        &ldquo;{s.quote.length > 150 ? s.quote.slice(0, 150) + "…" : s.quote}&rdquo;
                                      </span>
                                    )}
                                  </span>
                                );
                              })}
                          </div>
                          {confidence && (
                            <div className="mt-1">
                              <span className={`inline-block rounded-full px-2 py-0.5 text-[0.6rem] font-medium ${
                                confidence === "HOOG" || confidence === "HIGH"
                                  ? "bg-green-100 text-green-700"
                                  : confidence === "MIDDEL" || confidence === "MEDIUM"
                                    ? "bg-amber-100 text-amber-700"
                                    : "bg-red-100 text-red-700"
                              }`}>
                                {confidence === "HOOG" || confidence === "HIGH"
                                  ? "Hoge betrouwbaarheid"
                                  : confidence === "MIDDEL" || confidence === "MEDIUM"
                                    ? "Gemiddelde betrouwbaarheid"
                                    : "Lage betrouwbaarheid"}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    msg.content
                  )}
                </div>
              </div>
              );
            })}
            {chatLoading && (
              <div className="flex justify-start">
                <div
                  className="flex items-center gap-2 rounded-2xl px-4 py-2.5"
                  style={{
                    backgroundColor: cardBg,
                    border: `1px solid ${borderColor}`,
                  }}
                >
                  <Loader2
                    className="h-4 w-4 animate-spin"
                    style={{ color: mutedColor }}
                  />
                  <span className="text-sm" style={{ color: mutedColor }}>
                    Aan het typen...
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <form
            onSubmit={onSubmit}
            className="p-3"
            style={{ borderTop: `1px solid ${borderColor}` }}
          >
            <div className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={placeholderText}
                disabled={chatLoading}
                className="flex-1 rounded-lg border px-3 py-2 text-sm outline-none"
                style={{
                  backgroundColor: inputBg,
                  borderColor: borderColor,
                  color: textColor,
                }}
              />
              <button
                type="submit"
                disabled={chatLoading || !input.trim()}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white transition-opacity disabled:opacity-50"
                style={{ backgroundColor: brandPrimary }}
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

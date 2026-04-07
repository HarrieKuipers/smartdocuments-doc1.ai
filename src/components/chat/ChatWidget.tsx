"use client";

import { useState, useRef, useEffect, useCallback, useImperativeHandle, forwardRef, useMemo, isValidElement, cloneElement, type ReactNode } from "react";
import { BookOpen, X, Send, Maximize2, Minimize2, ArrowLeft, FileText, ChevronRight, ChevronDown } from "lucide-react";
import { getLangStrings, type DocumentLanguage } from "@/lib/ai/language";
import ReactMarkdown from "react-markdown";

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

interface ChatWidgetProps {
  documentId: string;
  brandPrimary?: string;
  chatMode?: "terms-only" | "terms-and-chat" | "full";
  terms?: { term: string; definition: string; occurrences: number }[];
  language?: DocumentLanguage;
  /** Collection mode: provide collectionSlug to enable multi-document chat */
  collectionSlug?: string;
  /** Custom intro text shown above suggestions */
  customIntro?: string;
  /** Custom placeholder for the input field */
  customPlaceholder?: string;
  /** Custom suggested questions */
  customSuggestions?: string[];
  /** Pre-cached answers for suggestions */
  cachedAnswers?: {
    question: string;
    answer: string;
    sourceDocuments?: { shortId: string; title: string }[];
  }[];
  /** Documents in the collection (collection mode only) */
  collectionDocuments?: {
    title: string;
    shortId: string;
    coverImageUrl?: string;
    customCoverUrl?: string;
    pageCount?: number;
    chatSuggestions?: string[];
    chatSuggestionsCache?: {
      question: string;
      answer: string;
      sourceDocuments?: { shortId: string; title: string }[];
    }[];
    keyPoints?: { text: string; explanation?: string }[];
    pageImages?: {
      pageNumber: number;
      url: string;
      contentType?: "table" | "chart" | "diagram" | "image-with-text";
      description?: string;
    }[];
  }[];
  /** Display name of the document or collection (shown in header & greeting) */
  contextName?: string;
  /** Key points from the document for welcome screen */
  keyPoints?: { text: string; explanation?: string }[];
  /** Page images with optional visual content metadata for welcome screen */
  pageImages?: {
    pageNumber: number;
    url: string;
    contentType?: "table" | "chart" | "diagram" | "image-with-text";
    description?: string;
  }[];
}

export interface ChatWidgetRef {
  askQuestion: (question: string) => void;
  showTermDefinition: (term: string, definition: string) => void;
}

function extractConfidence(text: string) {
  const match = text.match(/\[(?:Betrouwbaarheid|Confidence):\s*(HOOG|MIDDEL|LAAG|HIGH|MEDIUM|LOW)\]/i);
  return {
    cleaned: match ? text.replace(match[0], "").trim() : text,
    confidence: match ? match[1].toUpperCase() as "HOOG" | "MIDDEL" | "LAAG" | "HIGH" | "MEDIUM" | "LOW" : null,
  };
}

/* ContentTypeIcon removed — sources now use minimal collapsible pattern */

/** Escape citation brackets so ReactMarkdown treats them as plain text,
 *  then style them in custom p/li components. */
function escapeCitations(text: string): string {
  // First: merge **DocName** [Pagina X] into a single escaped citation
  let result = text.replace(/\*\*([^*]+)\*\*\s*\[([^\]]+)\]/g, "\\[$1, $2\\]");
  // Then: escape any remaining standalone [brackets] (not preceded by \, not followed by ()
  result = result.replace(/(?<!\\)\[([^\]]+)\](?!\()/g, "\\[$1\\]");
  return result;
}

const CITATION_SPLIT = /(\[[^\]]+\])/g;
const CITATION_TEST = /^\[/;
function renderWithCitations(children: ReactNode): ReactNode {
  if (typeof children === "string") {
    const parts = children.split(CITATION_SPLIT);
    if (parts.length === 1) return children;
    return parts.map((part, i) =>
      CITATION_TEST.test(part)
        ? <span key={i} className="ml-0.5 text-[0.6rem] text-gray-400 font-normal">{part}</span>
        : part
    );
  }
  if (Array.isArray(children)) {
    return children.map((child, i) =>
      typeof child === "string"
        ? <span key={i}>{renderWithCitations(child)}</span>
        : isValidElement(child)
          ? cloneElement(child, { key: i } as Record<string, unknown>, renderWithCitations((child.props as { children?: ReactNode }).children))
          : child
    );
  }
  // Recurse into React elements (e.g. <strong>, <em>) so citations inside bold/italic get styled
  if (isValidElement(children)) {
    return cloneElement(children, {} as Record<string, unknown>, renderWithCitations((children.props as { children?: ReactNode }).children));
  }
  return children;
}

const citationComponents = {
  p: ({ children }: { children?: ReactNode }) => <p>{renderWithCitations(children)}</p>,
  li: ({ children }: { children?: ReactNode }) => <li>{renderWithCitations(children)}</li>,
};

const ChatWidget = forwardRef<ChatWidgetRef, ChatWidgetProps>(function ChatWidget(
  { documentId, brandPrimary = "#0062EB", chatMode = "terms-only", terms = [], language = "nl", collectionSlug, customIntro, customPlaceholder, customSuggestions, cachedAnswers, collectionDocuments, contextName, keyPoints, pageImages },
  ref
) {
  const isCollectionMode = !!collectionSlug;
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [expandedQuotes, setExpandedQuotes] = useState<Set<string>>(new Set());
  const [expandedSources, setExpandedSources] = useState<Set<number>>(new Set());
  const [selectedDocIndex, setSelectedDocIndex] = useState<number | null>(null);
  const skipAutoScrollRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const L = getLangStrings(language).chat;
  const introText = customIntro || L.emptyFull;
  const placeholderText = customPlaceholder || L.inputPlaceholder;
  const hasDocSuggestions = isCollectionMode && collectionDocuments?.some(d => d.chatSuggestions?.length);
  const hasCustomSuggestions = customSuggestions && customSuggestions.length > 0;
  const suggestions = hasCustomSuggestions ? customSuggestions : L.suggestedQuestions;
  // Hide static fallback questions when per-document suggestions exist
  const showSuggestions = hasCustomSuggestions || !hasDocSuggestions;
  const hasInput = isCollectionMode || chatMode !== "terms-only";

  // Build a lookup map for cached answers (collection-level + per-document)
  const cacheMap = useMemo(() => {
    const map = new Map<string, { answer: string; sourceDocuments?: { shortId: string; title: string }[] }>();
    if (cachedAnswers) {
      for (const c of cachedAnswers) {
        map.set(c.question, { answer: c.answer, sourceDocuments: c.sourceDocuments });
      }
    }
    // Merge per-document caches so clicking any per-document suggestion is instant
    if (collectionDocuments) {
      for (const doc of collectionDocuments) {
        if (doc.chatSuggestionsCache) {
          for (const c of doc.chatSuggestionsCache) {
            if (!map.has(c.question)) {
              map.set(c.question, { answer: c.answer, sourceDocuments: c.sourceDocuments });
            }
          }
        }
      }
    }
    return map;
  }, [cachedAnswers, collectionDocuments]);

  function handleSuggestionClick(question: string) {
    const cached = cacheMap.get(question);
    if (cached) {
      setMessages((prev) => [
        ...prev,
        { role: "user", content: question },
        { role: "assistant", content: cached.answer, sourceDocuments: cached.sourceDocuments },
      ]);
    } else {
      sendMessageText(question);
    }
  }

  useEffect(() => {
    if (skipAutoScrollRef.current) {
      skipAutoScrollRef.current = false;
      return;
    }
    if (scrollRef.current) {
      // Scroll to the last user message so the question stays in view
      const msgs = scrollRef.current.querySelectorAll("[data-msg-role='user']");
      const lastUserMsg = msgs[msgs.length - 1] as HTMLElement | undefined;
      if (lastUserMsg) {
        const container = scrollRef.current;
        container.scrollTo({ top: Math.max(0, lastUserMsg.offsetTop - 16), behavior: "smooth" });
      } else {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }
  }, [messages]);

  const sendMessageText = useCallback(async (messageText: string) => {
    if (!messageText.trim() || loading) return;

    setMessages((prev) => [...prev, { role: "user", content: messageText }]);
    setLoading(true);

    try {
      const endpoint = isCollectionMode
        ? `/api/reader/collections/${collectionSlug}/chat`
        : `/api/documents/${documentId}/chat`;

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: messageText,
          history: messages.slice(-10),
        }),
      });

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
          content: L.errorMessage,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, [documentId, collectionSlug, isCollectionMode, loading, messages, L.errorMessage]);

  // Expose askQuestion and showTermDefinition to parent
  useImperativeHandle(ref, () => ({
    askQuestion(question: string) {
      setOpen(true);
      setTimeout(() => {
        sendMessageText(question);
      }, 100);
    },
    showTermDefinition(term: string, definition: string) {
      skipAutoScrollRef.current = true;
      setOpen(true);
      setMessages((prev) => [
        ...prev,
        { role: "user", content: L.whatDoesItMean(term) },
        { role: "assistant", content: definition },
      ]);
      // Scroll to the user question after the panel has rendered
      let retries = 0;
      const scrollToQuestion = () => {
        if (scrollRef.current) {
          const msgs = scrollRef.current.querySelectorAll("[data-msg]");
          const userMsg = msgs[msgs.length - 2];
          if (userMsg) {
            const container = scrollRef.current;
            const msgTop = (userMsg as HTMLElement).offsetTop;
            // Leave generous whitespace above the blue label so it doesn't stick to the header
            container.scrollTo({ top: Math.max(0, msgTop - 48), behavior: "smooth" });
            return;
          }
        }
        // Panel may not be rendered yet — retry until it is (especially on first open)
        if (retries < 10) {
          retries++;
          requestAnimationFrame(scrollToQuestion);
        }
      };
      requestAnimationFrame(scrollToQuestion);
    },
  }), [sendMessageText, L]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || loading) return;
    const messageText = input.trim();
    setInput("");
    await sendMessageText(messageText);
  }

  return (
    <>
      {/* Launcher bubble — always visible, toggles open/close */}
      <button
        onClick={() => setOpen(!open)}
        aria-label={open
          ? (language === "en" ? "Close chat" : "Chat sluiten")
          : (language === "en" ? "Open AI assistant" : "Open AI assistent")}
        className={`fixed bottom-24 right-8 z-50 flex h-[70px] w-[70px] items-center justify-center rounded-full shadow-xl transition-transform hover:scale-110 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0062EB] ${!open ? "animate-[pulse-ring_2s_infinite]" : ""}`}
        style={{ background: `linear-gradient(135deg, ${brandPrimary}, ${brandPrimary}dd)` }}
      >
        {/* Avatar — visible when closed */}
        <img
          src="/chat_agent.png"
          alt=""
          aria-hidden="true"
          className={`absolute inset-0 h-full w-full rounded-full object-cover transition-all duration-300 ${open ? "scale-0 opacity-0" : "scale-100 opacity-100"}`}
        />
        {/* X icon — visible when open */}
        <X
          className={`absolute h-7 w-7 text-white transition-all duration-300 ${open ? "rotate-0 scale-100 opacity-100" : "rotate-90 scale-0 opacity-0"}`}
          aria-hidden="true"
        />
      </button>

      {/* Chat panel — always rendered, animated via CSS transitions */}
      <div
        role="dialog"
        aria-hidden={!open}
        aria-label={language === "en" ? "AI assistant chat" : "AI assistent chat"}
        className={`fixed z-50 flex flex-col overflow-hidden bg-cover bg-center transition-[opacity,transform,bottom,height,background-color] duration-300 ease-out ${
          open
            ? "opacity-100 translate-y-0"
            : "opacity-0 translate-y-4 pointer-events-none"
        } ${
          expanded
            ? "inset-y-0 right-0 w-full sm:w-[480px] rounded-none border-l shadow-2xl"
            : messages.length > 0
              ? "bottom-[178px] right-8 h-[calc(100vh-220px)] max-h-[700px] w-[400px] rounded-xl shadow-[0_12px_32px_rgba(8,15,26,0.12)]"
              : "bottom-[178px] right-8 h-[calc(100vh-220px)] max-h-[600px] w-[400px] rounded-xl shadow-[0_12px_32px_rgba(8,15,26,0.12)]"
        }`}
        style={{
          backgroundImage: messages.length > 0 ? "none" : "url('https://plus.unsplash.com/premium_photo-1663134377392-50c34664d632?q=80&w=3871&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D')",
          backgroundColor: messages.length > 0 ? "#ffffff" : undefined,
        }}
      >
          {/* Brand overlay over background image — hidden in chat mode */}
          <div
            className="absolute inset-0 z-0 transition-opacity duration-300"
            style={{ backgroundColor: brandPrimary, opacity: messages.length > 0 ? 0 : 0.85 }}
          />

          {/* Header — transparent on welcome, solid brand in chat */}
          <div
            className="relative z-10 flex items-center justify-between px-5 py-3 text-white transition-[background-color,border-color] duration-300"
            style={{
              backgroundColor: messages.length > 0 ? brandPrimary : "transparent",
              borderBottom: messages.length > 0 ? "1px solid rgba(255,255,255,0.15)" : "none",
            }}
          >
            <div className="flex items-center gap-3">
              {messages.length > 0 && (
                <button
                  onClick={() => setMessages([])}
                  className="rounded-full p-1 hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                  aria-label={language === "en" ? "Back to overview" : "Terug naar overzicht"}
                >
                  <ArrowLeft className="h-5 w-5" aria-hidden="true" />
                </button>
              )}
              <div className="h-8 w-8 flex-shrink-0 overflow-hidden rounded-lg">
                <img
                  src="/chat_agent.png"
                  alt="AI Assistant"
                  className="h-full w-full object-cover"
                />
              </div>
              {messages.length > 0 && (
                <div className="flex flex-col min-w-0">
                  <p className="text-sm font-semibold truncate max-w-[180px]">
                    {contextName || (isCollectionMode ? "Collectie Chat" : chatMode === "terms-only" ? L.headerTitleTermsOnly : L.headerTitle)}
                  </p>
                  {isCollectionMode && collectionDocuments && (
                    <p className="text-[0.6rem] text-white/70 truncate">
                      {collectionDocuments.length} documenten
                    </p>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setExpanded(!expanded)}
                className="rounded-full p-1.5 hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                aria-label={expanded
                  ? (language === "en" ? "Minimize chat" : "Chat verkleinen")
                  : (language === "en" ? "Maximize chat" : "Chat vergroten")}
              >
                {expanded ? <Minimize2 className="h-4 w-4" aria-hidden="true" /> : <Maximize2 className="h-4 w-4" aria-hidden="true" />}
              </button>
              {/* Close button only in expanded mode (bubble is hidden behind panel) */}
              {expanded && (
                <button
                  onClick={() => setOpen(false)}
                  className="rounded-full p-1.5 hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                  aria-label={language === "en" ? "Close chat" : "Chat sluiten"}
                >
                  <X className="h-5 w-5" aria-hidden="true" />
                </button>
              )}
            </div>
          </div>

          {/* Content area */}
          <div ref={scrollRef} className="relative z-10 flex-1 overflow-y-auto">
            {/* ── Welcome screen ── */}
            {messages.length === 0 && (
              <div className="flex flex-col min-h-full">
                {/* Greeting — transparent, shows the panel background image */}
                <div className="px-5 pt-5 pb-6 text-white">
                  <h2 className="text-xl font-bold">
                    {language === "en" ? "Hi there! 👋" : "Hallo! 👋"}
                  </h2>
                  <p className="mt-1.5 text-sm text-white/90">
                    {customIntro
                      ? customIntro
                      : isCollectionMode && collectionDocuments
                        ? (language === "en"
                          ? `Ask questions across ${collectionDocuments.length} documents in this collection`
                          : `Stel vragen over ${collectionDocuments.length} documenten in deze collectie`)
                        : contextName
                          ? (language === "en" ? `Ask questions about ${contextName}` : `Stel vragen over ${contextName}`)
                          : chatMode === "terms-only"
                            ? L.emptyTermsOnly
                            : chatMode === "terms-and-chat"
                              ? L.emptyTermsAndChat
                              : introText}
                  </p>
                </div>

                {/* White content area — rounds up into the colored section */}
                <div className="relative flex-1 rounded-t-2xl bg-white px-5 pt-5 pb-4 space-y-4 overflow-y-auto">
                  {/* Collection document cards — horizontal scroll + tap to explore */}
                  {isCollectionMode && collectionDocuments && collectionDocuments.length > 0 && (
                    <div>
                      <p className="text-[0.7rem] font-semibold uppercase tracking-wider text-gray-400 mb-2">
                        {collectionDocuments.length} {language === "en" ? "documents" : "documenten"}
                      </p>
                      <div className="flex gap-2.5 overflow-x-auto pb-2 -mx-5 px-5 scrollbar-hide" style={{ scrollbarWidth: "none" }}>
                        {collectionDocuments.map((doc, i) => (
                          <button
                            key={i}
                            onClick={() => setSelectedDocIndex(selectedDocIndex === i ? null : i)}
                            className={`flex-shrink-0 w-[100px] rounded-xl border text-left transition-all ${
                              selectedDocIndex === i
                                ? "border-2 shadow-md"
                                : "border-gray-200 hover:border-gray-300 hover:shadow-sm"
                            }`}
                            style={selectedDocIndex === i ? { borderColor: brandPrimary } : undefined}
                          >
                            {(doc.customCoverUrl || doc.coverImageUrl) ? (
                              <img
                                src={doc.customCoverUrl || doc.coverImageUrl}
                                alt=""
                                className="w-full aspect-[3/4] rounded-t-xl object-cover bg-gray-100"
                              />
                            ) : (
                              <div
                                className="flex w-full aspect-[3/4] items-center justify-center rounded-t-xl"
                                style={{ backgroundColor: `${brandPrimary}08` }}
                              >
                                <FileText className="h-6 w-6" style={{ color: `${brandPrimary}40` }} aria-hidden="true" />
                              </div>
                            )}
                            <div className="px-2 py-1.5">
                              <p className="text-[0.6rem] font-medium text-gray-700 line-clamp-2 leading-tight">{doc.title}</p>
                              {doc.pageCount && (
                                <p className="text-[0.55rem] text-gray-400 mt-0.5">{doc.pageCount} p.</p>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>

                      {/* Selected document details */}
                      {selectedDocIndex !== null && collectionDocuments[selectedDocIndex] && (() => {
                        const doc = collectionDocuments[selectedDocIndex];
                        const hasContent = doc.keyPoints?.length || doc.pageImages?.length || doc.chatSuggestions?.length;
                        return hasContent ? (
                          <div className="mt-3 space-y-3 animate-[slideUp_0.15s_ease-out]">
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-semibold text-gray-700 truncate max-w-[250px]">{doc.title}</p>
                              <a
                                href={`/${doc.shortId}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[0.6rem] font-medium hover:underline flex-shrink-0"
                                style={{ color: brandPrimary }}
                              >
                                {language === "en" ? "Open" : "Openen"} ↗
                              </a>
                            </div>

                            {/* Key points */}
                            {doc.keyPoints && doc.keyPoints.length > 0 && (
                              <div className="space-y-1.5">
                                {doc.keyPoints.slice(0, 3).map((kp, ki) => (
                                  <div key={ki} className="flex items-start gap-2 rounded-lg border border-gray-100 bg-gray-50/50 px-2.5 py-2">
                                    <span
                                      className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full text-[0.6rem] font-bold text-white mt-0.5"
                                      style={{ backgroundColor: brandPrimary }}
                                    >
                                      {ki + 1}
                                    </span>
                                    <p className="text-[0.7rem] text-gray-700 leading-relaxed">{kp.text}</p>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Visual content */}
                            {doc.pageImages && doc.pageImages.length > 0 && (
                              <div className="grid grid-cols-2 gap-2">
                                {doc.pageImages.slice(0, 4).map((pi, pii) => {
                                  const typeEmoji = pi.contentType === "table" ? "📊" : pi.contentType === "chart" ? "📈" : pi.contentType === "diagram" ? "🔀" : pi.contentType === "image-with-text" ? "🖼️" : "";
                                  const typeLabel = language === "en"
                                    ? (pi.contentType === "table" ? "Table" : pi.contentType === "chart" ? "Chart" : pi.contentType === "diagram" ? "Diagram" : pi.contentType === "image-with-text" ? "Image" : "")
                                    : (pi.contentType === "table" ? "Tabel" : pi.contentType === "chart" ? "Grafiek" : pi.contentType === "diagram" ? "Diagram" : pi.contentType === "image-with-text" ? "Afbeelding" : "");
                                  return (
                                    <button
                                      key={pii}
                                      onClick={() => setLightboxUrl(pi.url)}
                                      className="overflow-hidden rounded-lg border border-gray-200 hover:border-gray-400 shadow-sm hover:shadow transition-all text-left"
                                    >
                                      <img src={pi.url} alt={pi.description || `Page ${pi.pageNumber}`} className="w-full aspect-[4/3] object-cover bg-gray-50" loading="lazy" />
                                      <div className="px-2 py-1 bg-gray-50 border-t border-gray-100">
                                        <span className="text-[0.6rem] text-gray-500">{typeEmoji} {typeLabel} · p. {pi.pageNumber}</span>
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            )}

                            {/* Suggestions */}
                            {doc.chatSuggestions && doc.chatSuggestions.length > 0 && (
                              <div className="divide-y divide-gray-200 overflow-hidden rounded-xl border border-gray-200">
                                {doc.chatSuggestions.map((q, qi) => (
                                  <button
                                    key={qi}
                                    onClick={() => handleSuggestionClick(q)}
                                    className="flex w-full items-center justify-between px-4 py-3 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50"
                                  >
                                    <span>{q}</span>
                                    <ChevronRight className="h-5 w-5 text-gray-400 flex-shrink-0" aria-hidden="true" />
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="mt-3 flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50/50 px-3 py-2.5 animate-[slideUp_0.15s_ease-out]">
                            <p className="text-xs text-gray-500 truncate">{doc.title}</p>
                            <a
                              href={`/${doc.shortId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[0.6rem] font-medium hover:underline flex-shrink-0"
                              style={{ color: brandPrimary }}
                            >
                              {language === "en" ? "Open" : "Openen"} ↗
                            </a>
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {/* Key points */}
                  {keyPoints && keyPoints.length > 0 && (
                    <div>
                      <p className="text-[0.7rem] font-semibold uppercase tracking-wider text-gray-400 mb-2">
                        {language === "en" ? "Key points" : "Hoofdpunten"}
                      </p>
                      <div className="space-y-2">
                        {keyPoints.slice(0, 4).map((kp, i) => (
                          <div key={i} className="flex items-start gap-2.5 rounded-lg border border-gray-100 bg-gray-50/50 px-3 py-2.5">
                            <span
                              className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[0.65rem] font-bold text-white mt-0.5"
                              style={{ backgroundColor: brandPrimary }}
                            >
                              {i + 1}
                            </span>
                            <p className="text-xs text-gray-700 leading-relaxed">{kp.text}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Visual content thumbnails */}
                  {pageImages && pageImages.length > 0 && (
                    <div>
                      <p className="text-[0.7rem] font-semibold uppercase tracking-wider text-gray-400 mb-2">
                        {language === "en" ? "Visual content" : "Visuele content"}
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {pageImages.slice(0, 4).map((pi, i) => {
                          const typeEmoji = pi.contentType === "table" ? "📊" : pi.contentType === "chart" ? "📈" : pi.contentType === "diagram" ? "🔀" : pi.contentType === "image-with-text" ? "🖼️" : "";
                          const typeLabel = language === "en"
                            ? (pi.contentType === "table" ? "Table" : pi.contentType === "chart" ? "Chart" : pi.contentType === "diagram" ? "Diagram" : pi.contentType === "image-with-text" ? "Image" : "")
                            : (pi.contentType === "table" ? "Tabel" : pi.contentType === "chart" ? "Grafiek" : pi.contentType === "diagram" ? "Diagram" : pi.contentType === "image-with-text" ? "Afbeelding" : "");
                          return (
                            <button
                              key={i}
                              onClick={() => setLightboxUrl(pi.url)}
                              className="overflow-hidden rounded-lg border border-gray-200 hover:border-gray-400 shadow-sm hover:shadow transition-all text-left"
                            >
                              <img
                                src={pi.url}
                                alt={pi.description || `Page ${pi.pageNumber}`}
                                className="w-full aspect-[4/3] object-cover bg-gray-50"
                                loading="lazy"
                              />
                              <div className="px-2 py-1.5 bg-gray-50 border-t border-gray-100">
                                <span className="text-[0.65rem] text-gray-500 leading-snug">
                                  {typeEmoji} {typeLabel} · {language === "en" ? "p." : "p."} {pi.pageNumber}
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* terms-only: term starters */}
                  {chatMode === "terms-only" && terms.length > 0 && (
                    <div>
                      {(keyPoints?.length || pageImages?.length) ? (
                        <p className="text-[0.7rem] font-semibold uppercase tracking-wider text-gray-400 mb-2">
                          {language === "en" ? "Terms" : "Begrippen"}
                        </p>
                      ) : null}
                      <div className="divide-y divide-gray-200 overflow-hidden rounded-xl border border-gray-200">
                        {terms.map((t, i) => (
                          <button
                            key={i}
                            onClick={() => {
                              setMessages((prev) => [
                                ...prev,
                                { role: "user", content: L.whatDoesItMean(t.term) },
                                { role: "assistant", content: t.definition },
                              ]);
                            }}
                            className="flex w-full items-center justify-between px-4 py-3.5 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50"
                          >
                            <span className="flex items-center gap-2.5">
                              <BookOpen className="h-4 w-4 text-gray-400 flex-shrink-0" aria-hidden="true" />
                              <span className="font-medium">{t.term}</span>
                            </span>
                            <ChevronRight className="h-5 w-5 text-gray-400 flex-shrink-0" aria-hidden="true" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* terms-and-chat: terms + question starters */}
                  {chatMode === "terms-and-chat" && (
                    <>
                      {terms.length > 0 && (
                        <div>
                          {(keyPoints?.length || pageImages?.length) ? (
                            <p className="text-[0.7rem] font-semibold uppercase tracking-wider text-gray-400 mb-2">
                              {language === "en" ? "Terms" : "Begrippen"}
                            </p>
                          ) : null}
                          <div className="divide-y divide-gray-200 overflow-hidden rounded-xl border border-gray-200">
                            {terms.slice(0, 5).map((t, i) => (
                              <button
                                key={i}
                                onClick={() => {
                                  setMessages((prev) => [
                                    ...prev,
                                    { role: "user", content: L.whatDoesItMean(t.term) },
                                    { role: "assistant", content: t.definition },
                                  ]);
                                }}
                                className="flex w-full items-center justify-between px-4 py-3.5 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50"
                              >
                                <span className="flex items-center gap-2.5">
                                  <BookOpen className="h-4 w-4 text-gray-400 flex-shrink-0" aria-hidden="true" />
                                  <span className="font-medium">{t.term}</span>
                                </span>
                                <ChevronRight className="h-5 w-5 text-gray-400 flex-shrink-0" aria-hidden="true" />
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      {showSuggestions && (
                        <div className="divide-y divide-gray-200 overflow-hidden rounded-xl border border-gray-200">
                          {suggestions.map((q, i) => (
                            <button
                              key={i}
                              onClick={() => handleSuggestionClick(q)}
                              className="flex w-full items-center justify-between px-4 py-3.5 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50"
                            >
                              <span>{q}</span>
                              <ChevronRight className="h-5 w-5 text-gray-400 flex-shrink-0" aria-hidden="true" />
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  )}

                  {/* full: question starters */}
                  {chatMode === "full" && showSuggestions && (
                    <div className="divide-y divide-gray-200 overflow-hidden rounded-xl border border-gray-200">
                      {suggestions.map((q, i) => (
                        <button
                          key={i}
                          onClick={() => handleSuggestionClick(q)}
                          className="flex w-full items-center justify-between px-4 py-3.5 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50"
                        >
                          <span>{q}</span>
                          <ChevronRight className="h-5 w-5 text-gray-400 flex-shrink-0" aria-hidden="true" />
                        </button>
                      ))}
                    </div>
                  )}

                  {/* CTA — "Chat with AI" button (only when input is available) */}
                  {hasInput && (
                    <div>
                      <button
                        onClick={() => inputRef.current?.focus()}
                        className="flex w-full items-center justify-between rounded-xl p-4 text-white transition-opacity hover:opacity-90"
                        style={{ backgroundColor: brandPrimary }}
                      >
                        <div className="text-left">
                          <p className="font-semibold text-sm">
                            {language === "en" ? "Ask a question" : "Stel een vraag"}
                          </p>
                          <p className="text-xs opacity-80 mt-0.5">
                            {language === "en"
                              ? "Our AI assistant is here to help"
                              : "Onze AI assistent helpt je verder"}
                          </p>
                        </div>
                        <Send className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── Messages ── */}
            {messages.length > 0 && (
              <div className="bg-white px-4 py-5 space-y-5 min-h-full animate-[slideUp_0.3s_ease-out]">
                {messages.map((msg, i) => (
                  <div
                    key={i}
                    data-msg
                    data-msg-role={msg.role}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    {msg.role === "assistant" && (
                      <img src="/chat_agent.png" alt="" className="h-7 w-7 rounded-full object-cover flex-shrink-0 mt-0.5 mr-2.5" aria-hidden="true" />
                    )}
                    <div
                      className={`text-[0.8125rem] leading-relaxed ${
                        msg.role === "user"
                          ? "max-w-[78%] rounded-2xl rounded-br-md px-4 py-2.5 text-white"
                          : "max-w-[85%] rounded-2xl rounded-tl-md bg-[#f5f7f9] px-4 py-3 text-gray-800"
                      }`}
                      style={
                        msg.role === "user"
                          ? { backgroundColor: brandPrimary }
                          : undefined
                      }
                    >
                      {msg.role === "assistant" ? (() => {
                        const { cleaned } = extractConfidence(msg.content);
                        const cleanedContent = cleaned.replace(/\s*\[Document:\s*"[^"]*"\]/g, "");
                        const filteredSources = msg.sources?.filter((s) => s.page || s.section) || [];
                        const pageImages = msg.sources
                          ? [...new Map(msg.sources.filter((s) => s.pageImageUrl).map((s) => [s.page ?? s.pageImageUrl, s])).values()]
                          : [];
                        const isSourcesOpen = expandedSources.has(i);
                        return (
                          <div>
                            <div className="prose prose-sm max-w-none text-gray-800 [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_ul]:my-1.5 [&_ol]:my-1.5 [&_li]:my-0 [&_p]:my-1.5 [&_p]:leading-relaxed [&_h1]:text-sm [&_h1]:font-semibold [&_h1]:mt-3 [&_h1]:mb-1 [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:mt-3 [&_h2]:mb-1 [&_h3]:text-[0.8125rem] [&_h3]:font-semibold [&_h3]:mt-2.5 [&_h3]:mb-0.5 [&_strong]:font-semibold [&_a]:text-blue-600 [&_a]:no-underline hover:[&_a]:underline">
                              <ReactMarkdown components={citationComponents}>{escapeCitations(cleanedContent)}</ReactMarkdown>
                            </div>

                            {/* Page images — always visible with captions */}
                            {pageImages.length > 0 && (
                              <div className="mt-3 space-y-2">
                                {pageImages.map((s, si) => {
                                  const typeEmoji = s.contentType === "table" ? "📊" : s.contentType === "chart" ? "📈" : s.contentType === "diagram" ? "🔀" : s.contentType === "image-with-text" ? "🖼️" : "";
                                  const typeLabel = language === "en"
                                    ? (s.contentType === "table" ? "Table" : s.contentType === "chart" ? "Chart" : s.contentType === "diagram" ? "Diagram" : s.contentType === "image-with-text" ? "Image" : "")
                                    : (s.contentType === "table" ? "Tabel" : s.contentType === "chart" ? "Grafiek" : s.contentType === "diagram" ? "Diagram" : s.contentType === "image-with-text" ? "Afbeelding" : "");
                                  const caption = [
                                    typeEmoji && typeLabel ? `${typeEmoji} ${typeLabel}` : null,
                                    s.section ? s.section : null,
                                    s.page ? `${language === "en" ? "page" : "pagina"} ${s.page}` : null,
                                  ].filter(Boolean).join(" · ");
                                  return (
                                    <button
                                      key={si}
                                      onClick={() => setLightboxUrl(s.pageImageUrl!)}
                                      className="block w-full overflow-hidden rounded-lg border border-gray-200 hover:border-gray-400 shadow-sm hover:shadow transition-all text-left"
                                      aria-label={`View page ${s.page || ""} image`}
                                    >
                                      <img
                                        src={s.pageImageUrl}
                                        alt={caption || `Page ${s.page || ""}`}
                                        className="w-full max-h-[200px] object-contain bg-gray-50"
                                      />
                                      {caption && (
                                        <div className="px-2.5 py-1.5 bg-gray-50 border-t border-gray-100">
                                          <span className="text-[0.7rem] text-gray-500 leading-snug">{caption}</span>
                                        </div>
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                            )}

                            {/* Collapsible text sources */}
                            {filteredSources.length > 0 && (
                              <div className={pageImages.length > 0 ? "mt-2" : "mt-2.5"}>
                                <button
                                  onClick={() => {
                                    setExpandedSources((prev) => {
                                      const next = new Set(prev);
                                      if (next.has(i)) next.delete(i);
                                      else next.add(i);
                                      return next;
                                    });
                                  }}
                                  className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                  <FileText className="h-3 w-3" aria-hidden="true" />
                                  <span>
                                    {filteredSources.length} {filteredSources.length === 1
                                      ? (language === "en" ? "source" : "bron")
                                      : (language === "en" ? "sources" : "bronnen")}
                                  </span>
                                  <ChevronDown
                                    className={`h-3 w-3 transition-transform duration-200 ${isSourcesOpen ? "rotate-180" : ""}`}
                                    aria-hidden="true"
                                  />
                                </button>

                                {isSourcesOpen && (
                                  <div className="mt-2 space-y-1 animate-[slideUp_0.15s_ease-out]">
                                    {filteredSources.slice(0, 4).map((s, si) => {
                                      const quoteKey = `${i}-${si}`;
                                      const isQuoteOpen = expandedQuotes.has(quoteKey);
                                      const label = s.documentTitle
                                        ? `${s.documentTitle}${s.page ? `, p. ${s.page}` : ""}`
                                        : `${s.page ? `p. ${s.page}` : ""}${s.page && s.section ? " — " : ""}${s.section ? (s.section.length > 40 ? s.section.slice(0, 40) + "…" : s.section) : ""}`;
                                      return (
                                        <div key={si}>
                                          <button
                                            onClick={() => {
                                              if (!s.quote) return;
                                              setExpandedQuotes((prev) => {
                                                const next = new Set(prev);
                                                if (next.has(quoteKey)) next.delete(quoteKey);
                                                else next.add(quoteKey);
                                                return next;
                                              });
                                            }}
                                            className={`flex items-center gap-1.5 text-[0.7rem] text-gray-500 ${s.quote ? "hover:text-gray-700 cursor-pointer" : "cursor-default"} transition-colors text-left`}
                                          >
                                            <span className="h-1 w-1 rounded-full bg-gray-300 flex-shrink-0" />
                                            <span>{label}</span>
                                            {s.quote && (
                                              <ChevronDown
                                                className={`h-2.5 w-2.5 flex-shrink-0 transition-transform duration-200 ${isQuoteOpen ? "rotate-180" : ""}`}
                                                aria-hidden="true"
                                              />
                                            )}
                                          </button>
                                          {s.quote && isQuoteOpen && (
                                            <p className="ml-3.5 mt-0.5 text-[0.65rem] italic text-gray-400 leading-relaxed border-l-2 border-gray-200 pl-2">
                                              &ldquo;{s.quote.length > 180 ? s.quote.slice(0, 180) + "…" : s.quote}&rdquo;
                                            </p>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })() : (
                        msg.content
                      )}
                    </div>
                  </div>
                ))}

                {/* Typing indicator */}
                {loading && (
                  <div className="flex items-start">
                    <img src="/chat_agent.png" alt="" className="h-7 w-7 rounded-full object-cover flex-shrink-0 mt-0.5 mr-2.5" aria-hidden="true" />
                    <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-md bg-[#f5f7f9] px-4 py-3">
                      <span className="h-1.5 w-1.5 rounded-full bg-gray-400 animate-[bounce-dot_1.4s_ease-in-out_infinite]" />
                      <span className="h-1.5 w-1.5 rounded-full bg-gray-400 animate-[bounce-dot_1.4s_ease-in-out_0.2s_infinite]" />
                      <span className="h-1.5 w-1.5 rounded-full bg-gray-400 animate-[bounce-dot_1.4s_ease-in-out_0.4s_infinite]" />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Input area */}
          {hasInput ? (
            <div className="relative z-10 border-t border-gray-200 bg-white px-5 py-3">
              <form onSubmit={sendMessage} aria-label={language === "en" ? "Send a message" : "Stuur een bericht"}>
                <div className="relative flex items-center rounded-xl bg-[#f5f7f9]">
                  <label htmlFor="chat-input" className="sr-only">{placeholderText}</label>
                  <input
                    ref={inputRef}
                    id="chat-input"
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={placeholderText}
                    disabled={loading}
                    className="flex-1 bg-transparent py-3 pl-4 pr-12 text-sm outline-none placeholder:text-gray-400 disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={loading || !input.trim()}
                    className="absolute right-1.5 flex h-8 w-8 items-center justify-center rounded-lg text-white transition-opacity disabled:opacity-30"
                    style={{ backgroundColor: brandPrimary }}
                    aria-label={language === "en" ? "Send message" : "Verstuur bericht"}
                  >
                    <Send className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </form>
              {isCollectionMode && (
                <p className="mt-2 text-center text-[0.65rem] text-gray-400">
                  Powered by doc1.ai
                </p>
              )}
            </div>
          ) : (
            <div className="relative z-10 border-t border-gray-200 bg-white px-5 py-3">
              <p className="text-xs text-center text-gray-400">
                {L.clickHighlightedWord}
              </p>
            </div>
          )}
        </div>

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
    </>
  );
});

export default ChatWidget;

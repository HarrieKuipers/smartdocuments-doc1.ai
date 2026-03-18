"use client";

import { useState, useRef, useEffect, useCallback, useImperativeHandle, forwardRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BookOpen, MessageSquare, X, Send, Loader2, Maximize2, Minimize2, ArrowLeft } from "lucide-react";
import { getLangStrings, type DocumentLanguage } from "@/lib/ai/language";
import ReactMarkdown from "react-markdown";

interface SourceDocument {
  shortId: string;
  title: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  sourceDocuments?: SourceDocument[];
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
}

export interface ChatWidgetRef {
  askQuestion: (question: string) => void;
  showTermDefinition: (term: string, definition: string) => void;
}

const ChatWidget = forwardRef<ChatWidgetRef, ChatWidgetProps>(function ChatWidget(
  { documentId, brandPrimary = "#0062EB", chatMode = "terms-only", terms = [], language = "nl", collectionSlug, customIntro, customPlaceholder, customSuggestions, cachedAnswers },
  ref
) {
  const isCollectionMode = !!collectionSlug;
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(isCollectionMode);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const skipAutoScrollRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const L = getLangStrings(language).chat;
  const introText = customIntro || L.emptyFull;
  const placeholderText = customPlaceholder || L.inputPlaceholder;
  const suggestions = customSuggestions && customSuggestions.length > 0 ? customSuggestions : L.suggestedQuestions;

  // Build a lookup map for cached answers
  const cacheMap = useMemo(() => {
    const map = new Map<string, { answer: string; sourceDocuments?: { shortId: string; title: string }[] }>();
    if (cachedAnswers) {
      for (const c of cachedAnswers) {
        map.set(c.question, { answer: c.answer, sourceDocuments: c.sourceDocuments });
      }
    }
    return map;
  }, [cachedAnswers]);

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
      {/* Floating button with chat agent avatar */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label={language === "en" ? "Open AI assistant" : "Open AI assistent"}
          className="fixed bottom-24 right-8 z-50 h-[70px] w-[70px] rounded-full shadow-xl transition-transform hover:scale-110 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0062EB] animate-[pulse-ring_2s_infinite]"
          style={{
            background: `linear-gradient(135deg, ${brandPrimary}, ${brandPrimary}dd)`,
          }}
        >
          <img
            src="/chat_agent.png"
            alt=""
            aria-hidden="true"
            className="h-full w-full rounded-full object-cover"
          />
          <span className="absolute -right-1 -top-1 rounded-full bg-red-500 px-1.5 py-0.5 text-[0.7rem] font-bold text-white shadow-sm" aria-hidden="true">
            AI
          </span>
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div
          role="dialog"
          aria-label={language === "en" ? "AI assistant chat" : "AI assistent chat"}
          className={`fixed z-50 flex flex-col overflow-hidden bg-white shadow-2xl transition-all duration-300 ${
          expanded
            ? "inset-y-0 right-0 w-full sm:w-[480px] rounded-none border-l"
            : "bottom-20 right-6 h-[500px] w-[380px] rounded-2xl border"
        }`}>
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3 text-white"
            style={{ background: `linear-gradient(135deg, ${brandPrimary}, ${brandPrimary}cc)` }}
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
              <div className="h-10 w-10 overflow-hidden rounded-full shadow-sm">
                <img
                  src="/chat_agent.png"
                  alt="AI Assistant"
                  className="h-full w-full object-cover"
                />
              </div>
              <div>
                <p className="font-medium">
                  {isCollectionMode ? "Collectie Chat" : chatMode === "terms-only" ? L.headerTitleTermsOnly : L.headerTitle}
                </p>
                <p className="text-xs opacity-80">
                  {chatMode === "terms-only"
                    ? L.subtitleTermsOnly
                    : chatMode === "terms-and-chat"
                      ? L.subtitleTermsAndChat
                      : L.subtitleFull}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setExpanded(!expanded)}
                className="rounded-full p-1 hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                aria-label={expanded
                  ? (language === "en" ? "Minimize chat" : "Chat verkleinen")
                  : (language === "en" ? "Maximize chat" : "Chat vergroten")}
              >
                {expanded ? <Minimize2 className="h-4 w-4" aria-hidden="true" /> : <Maximize2 className="h-4 w-4" aria-hidden="true" />}
              </button>
              <button
                onClick={() => setOpen(false)}
                className="rounded-full p-1 hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                aria-label={language === "en" ? "Close chat" : "Chat sluiten"}
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3" aria-live="polite" aria-relevant="additions">
            {messages.length === 0 && chatMode === "terms-only" && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground text-center">
                  {L.emptyTermsOnly}
                </p>
                {terms.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{L.termsLabel}</p>
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
                        className="flex items-center gap-2 w-full rounded-lg border p-2 text-left text-sm hover:bg-gray-50 transition-colors"
                      >
                        <BookOpen className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" aria-hidden="true" />
                        <span className="font-medium" style={{ color: brandPrimary }}>{t.term}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            {messages.length === 0 && chatMode === "terms-and-chat" && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground text-center">
                  {L.emptyTermsAndChat}
                </p>
                {terms.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{L.termsLabel}</p>
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
                        className="flex items-center gap-2 w-full rounded-lg border p-2 text-left text-sm hover:bg-gray-50 transition-colors"
                      >
                        <BookOpen className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" aria-hidden="true" />
                        <span className="font-medium" style={{ color: brandPrimary }}>{t.term}</span>
                      </button>
                    ))}
                  </div>
                )}
                <div className="space-y-2 border-t pt-3">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{L.orAskQuestion}</p>
                  {suggestions.map((q, i) => (
                    <button
                      key={i}
                      onClick={() => handleSuggestionClick(q)}
                      className="block w-full rounded-lg border p-2 text-left text-sm hover:bg-gray-50 transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.length === 0 && chatMode === "full" && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground text-center">
                  {introText}
                </p>
                <div className="space-y-2">
                  {suggestions.map((q, i) => (
                    <button
                      key={i}
                      onClick={() => handleSuggestionClick(q)}
                      className="block w-full rounded-lg border p-2 text-left text-sm hover:bg-gray-50 transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((msg, i) => (
              <div
                key={i}
                data-msg
                data-msg-role={msg.role}
                className={`flex ${
                  msg.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                    msg.role === "user"
                      ? "text-white"
                      : "bg-gray-100 text-gray-800"
                  }`}
                  style={
                    msg.role === "user"
                      ? { backgroundColor: brandPrimary }
                      : undefined
                  }
                >
                  {msg.role === "assistant" ? (
                    <div>
                      <div className="prose prose-sm prose-gray max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_ul]:my-2 [&_ol]:my-2 [&_li]:my-0.5 [&_p]:my-2.5 [&_h1]:text-base [&_h1]:font-bold [&_h1]:mt-4 [&_h1]:mb-1.5 [&_h2]:text-sm [&_h2]:font-bold [&_h2]:mt-4 [&_h2]:mb-1.5 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mt-3 [&_h3]:mb-1 [&_strong]:font-semibold">
                        <ReactMarkdown>{msg.content.replace(/\s*\[Document:\s*"[^"]*"\]/g, "")}</ReactMarkdown>
                      </div>
                    </div>
                  ) : (
                    msg.content
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-2xl bg-gray-100 px-4 py-2">
                  <Loader2 className="h-4 w-4 animate-spin text-gray-500" aria-hidden="true" />
                  <span className="text-sm text-gray-500">{L.typing}</span>
                </div>
              </div>
            )}
          </div>

          {/* Input - hidden in terms-only mode (always shown in collection mode) */}
          {isCollectionMode || chatMode !== "terms-only" ? (
            <form onSubmit={sendMessage} className="border-t p-3" aria-label={language === "en" ? "Send a message" : "Stuur een bericht"}>
              <div className="flex gap-2">
                <label htmlFor="chat-input" className="sr-only">{placeholderText}</label>
                <Input
                  id="chat-input"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={placeholderText}
                  className="flex-1"
                  disabled={loading}
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={loading || !input.trim()}
                  style={{ backgroundColor: brandPrimary }}
                  aria-label={language === "en" ? "Send message" : "Verstuur bericht"}
                >
                  <Send className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            </form>
          ) : (
            <div className="border-t px-4 py-2.5">
              <p className="text-xs text-center text-muted-foreground">
                {L.clickHighlightedWord}
              </p>
            </div>
          )}
        </div>
      )}
    </>
  );
});

export default ChatWidget;

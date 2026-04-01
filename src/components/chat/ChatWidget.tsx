"use client";

import { useState, useRef, useEffect, useCallback, useImperativeHandle, forwardRef, useMemo } from "react";
import { BookOpen, X, Send, Maximize2, Minimize2, ArrowLeft, FileText, ChevronRight } from "lucide-react";
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
  /** Display name of the document or collection (shown in header & greeting) */
  contextName?: string;
}

export interface ChatWidgetRef {
  askQuestion: (question: string) => void;
  showTermDefinition: (term: string, definition: string) => void;
}

const ChatWidget = forwardRef<ChatWidgetRef, ChatWidgetProps>(function ChatWidget(
  { documentId, brandPrimary = "#0062EB", chatMode = "terms-only", terms = [], language = "nl", collectionSlug, customIntro, customPlaceholder, customSuggestions, cachedAnswers, contextName },
  ref
) {
  const isCollectionMode = !!collectionSlug;
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const skipAutoScrollRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const L = getLangStrings(language).chat;
  const introText = customIntro || L.emptyFull;
  const placeholderText = customPlaceholder || L.inputPlaceholder;
  const suggestions = customSuggestions && customSuggestions.length > 0 ? customSuggestions : L.suggestedQuestions;
  const hasInput = isCollectionMode || chatMode !== "terms-only";

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
              : "bottom-[178px] right-8 h-[520px] w-[400px] rounded-xl shadow-[0_12px_32px_rgba(8,15,26,0.12)]"
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
                <p className="text-sm font-semibold truncate max-w-[180px]">
                  {contextName || (isCollectionMode ? "Collectie Chat" : chatMode === "terms-only" ? L.headerTitleTermsOnly : L.headerTitle)}
                </p>
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
                <div className="relative flex-1 rounded-t-2xl bg-white px-5 pt-5 pb-4">
                  {/* terms-only: term starters */}
                  {chatMode === "terms-only" && terms.length > 0 && (
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
                  )}

                  {/* terms-and-chat: terms + question starters */}
                  {chatMode === "terms-and-chat" && (
                    <>
                      {terms.length > 0 && (
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
                      )}
                      <div className={`divide-y divide-gray-200 overflow-hidden rounded-xl border border-gray-200 ${terms.length > 0 ? "mt-3" : ""}`}>
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
                    </>
                  )}

                  {/* full: question starters */}
                  {chatMode === "full" && (
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
                    <div className="mt-4">
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
              <div className="bg-white p-5 space-y-4 min-h-full animate-[slideUp_0.3s_ease-out]">
                {messages.map((msg, i) => (
                  <div
                    key={i}
                    data-msg
                    data-msg-role={msg.role}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    {msg.role === "assistant" && (
                      <img src="/chat_agent.png" alt="" className="h-6 w-6 rounded-lg object-cover flex-shrink-0 mt-1 mr-2" aria-hidden="true" />
                    )}
                    <div
                      className={`max-w-[80%] text-sm ${
                        msg.role === "user"
                          ? "rounded-2xl rounded-tr-md px-4 py-3 text-white"
                          : "rounded-2xl rounded-tl-md bg-[#f5f7f9] px-4 py-3 text-gray-800"
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
                          {msg.sources && msg.sources.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1.5 border-t pt-2 border-gray-200/60">
                              {msg.sources
                                .filter((s) => s.page || s.section)
                                .slice(0, 4)
                                .map((s, si) => (
                                  <span
                                    key={si}
                                    className="inline-flex items-center gap-1 rounded-md bg-white/80 border border-gray-200 px-1.5 py-0.5 text-[0.65rem] text-gray-500"
                                  >
                                    <FileText className="h-2.5 w-2.5" aria-hidden="true" />
                                    {s.page ? `p. ${s.page}` : ""}
                                    {s.page && s.section ? " · " : ""}
                                    {s.section ? (s.section.length > 30 ? s.section.slice(0, 30) + "…" : s.section) : ""}
                                  </span>
                                ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        msg.content
                      )}
                    </div>
                  </div>
                ))}

                {/* Typing indicator — bouncing dots */}
                {loading && (
                  <div className="flex items-start">
                    <img src="/chat_agent.png" alt="" className="h-6 w-6 rounded-lg object-cover flex-shrink-0 mt-1 mr-2" aria-hidden="true" />
                    <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-md bg-[#f5f7f9] px-4 py-3">
                      <span className="h-2 w-2 rounded-full bg-gray-400 animate-[bounce-dot_1.4s_ease-in-out_infinite]" />
                      <span className="h-2 w-2 rounded-full bg-gray-400 animate-[bounce-dot_1.4s_ease-in-out_0.2s_infinite]" />
                      <span className="h-2 w-2 rounded-full bg-gray-400 animate-[bounce-dot_1.4s_ease-in-out_0.4s_infinite]" />
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
    </>
  );
});

export default ChatWidget;

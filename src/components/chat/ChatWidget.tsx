"use client";

import { useState, useRef, useEffect, useCallback, useImperativeHandle, forwardRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BookOpen, MessageSquare, X, Send, Loader2 } from "lucide-react";
import { getLangStrings, type DocumentLanguage } from "@/lib/ai/language";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ChatWidgetProps {
  documentId: string;
  brandPrimary?: string;
  chatMode?: "terms-only" | "terms-and-chat" | "full";
  terms?: { term: string; definition: string; occurrences: number }[];
  language?: DocumentLanguage;
}

export interface ChatWidgetRef {
  askQuestion: (question: string) => void;
  showTermDefinition: (term: string, definition: string) => void;
}

const ChatWidget = forwardRef<ChatWidgetRef, ChatWidgetProps>(function ChatWidget(
  { documentId, brandPrimary = "#0062EB", chatMode = "terms-only", terms = [], language = "nl" },
  ref
) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const L = getLangStrings(language).chat;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessageText = useCallback(async (messageText: string) => {
    if (!messageText.trim() || loading) return;

    setMessages((prev) => [...prev, { role: "user", content: messageText }]);
    setLoading(true);

    try {
      const res = await fetch(`/api/documents/${documentId}/chat`, {
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
        { role: "assistant", content: data.response },
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
  }, [documentId, loading, messages, L.errorMessage]);

  // Expose askQuestion and showTermDefinition to parent
  useImperativeHandle(ref, () => ({
    askQuestion(question: string) {
      setOpen(true);
      setTimeout(() => {
        sendMessageText(question);
      }, 100);
    },
    showTermDefinition(term: string, definition: string) {
      setOpen(true);
      setMessages((prev) => [
        ...prev,
        { role: "user", content: L.whatDoesItMean(term) },
        { role: "assistant", content: definition },
      ]);
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
          className="fixed bottom-24 right-8 z-50 h-[70px] w-[70px] rounded-full shadow-xl transition-transform hover:scale-110 active:scale-95 animate-[pulse-ring_2s_infinite]"
          style={{
            background: `linear-gradient(135deg, ${brandPrimary}, ${brandPrimary}dd)`,
          }}
        >
          <img
            src="/chat_agent.png"
            alt="AI Chat"
            className="h-full w-full rounded-full object-cover"
          />
          <span className="absolute -right-1 -top-1 rounded-full bg-red-500 px-1.5 py-0.5 text-[0.7rem] font-bold text-white shadow-sm">
            AI
          </span>
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-20 right-6 z-50 flex h-[500px] w-[380px] flex-col overflow-hidden rounded-2xl border bg-white shadow-2xl">
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3 text-white"
            style={{ background: `linear-gradient(135deg, ${brandPrimary}, ${brandPrimary}cc)` }}
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 overflow-hidden rounded-full shadow-sm">
                <img
                  src="/chat_agent.png"
                  alt="AI Assistant"
                  className="h-full w-full object-cover"
                />
              </div>
              <div>
                <p className="font-medium">
                  {chatMode === "terms-only" ? L.headerTitleTermsOnly : L.headerTitle}
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
            <button
              onClick={() => setOpen(false)}
              className="rounded-full p-1 hover:bg-white/20"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
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
                        <BookOpen className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
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
                        <BookOpen className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
                        <span className="font-medium" style={{ color: brandPrimary }}>{t.term}</span>
                      </button>
                    ))}
                  </div>
                )}
                <div className="space-y-2 border-t pt-3">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{L.orAskQuestion}</p>
                  {L.suggestedQuestions.map((q, i) => (
                    <button
                      key={i}
                      onClick={() => setInput(q)}
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
                  {L.emptyFull}
                </p>
                <div className="space-y-2">
                  {L.suggestedQuestions.map((q, i) => (
                    <button
                      key={i}
                      onClick={() => setInput(q)}
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
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-2xl bg-gray-100 px-4 py-2">
                  <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
                  <span className="text-sm text-gray-500">{L.typing}</span>
                </div>
              </div>
            )}
          </div>

          {/* Input - hidden in terms-only mode */}
          {chatMode !== "terms-only" ? (
            <form onSubmit={sendMessage} className="border-t p-3">
              <div className="flex gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={L.inputPlaceholder}
                  className="flex-1"
                  disabled={loading}
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={loading || !input.trim()}
                  style={{ backgroundColor: brandPrimary }}
                >
                  <Send className="h-4 w-4" />
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

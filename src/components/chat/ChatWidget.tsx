"use client";

import { useState, useRef, useEffect, useCallback, useImperativeHandle, forwardRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageSquare, X, Send, Loader2 } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ChatWidgetProps {
  documentId: string;
  brandPrimary?: string;
}

export interface ChatWidgetRef {
  askQuestion: (question: string) => void;
}

const ChatWidget = forwardRef<ChatWidgetRef, ChatWidgetProps>(function ChatWidget(
  { documentId, brandPrimary = "#0062EB" },
  ref
) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

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
          content: "Sorry, er is een fout opgetreden. Probeer het opnieuw.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, [documentId, loading, messages]);

  // Expose askQuestion to parent
  useImperativeHandle(ref, () => ({
    askQuestion(question: string) {
      setOpen(true);
      // Small delay to ensure panel is visible before sending
      setTimeout(() => {
        sendMessageText(question);
      }, 100);
    },
  }), [sendMessageText]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || loading) return;
    const messageText = input.trim();
    setInput("");
    await sendMessageText(messageText);
  }

  const suggestedQuestions = [
    "Wat is de belangrijkste conclusie?",
    "Kun je de hoofdpunten samenvatten?",
    "Wat zijn de financiële details?",
  ];

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-transform hover:scale-105 active:scale-95"
          style={{ backgroundColor: brandPrimary }}
        >
          <MessageSquare className="h-6 w-6 text-white" />
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-6 right-6 z-50 flex h-[500px] w-[380px] flex-col overflow-hidden rounded-2xl border bg-white shadow-2xl">
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3 text-white"
            style={{ backgroundColor: brandPrimary }}
          >
            <div>
              <p className="font-medium">AI Assistent</p>
              <p className="text-xs opacity-80">Altijd beschikbaar</p>
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
            {messages.length === 0 && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground text-center">
                  Stel een vraag over het document
                </p>
                <div className="space-y-2">
                  {suggestedQuestions.map((q, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setInput(q);
                      }}
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
                  <span className="text-sm text-gray-500">Typen...</span>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <form onSubmit={sendMessage} className="border-t p-3">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Stel een vraag over het document..."
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
        </div>
      )}
    </>
  );
});

export default ChatWidget;

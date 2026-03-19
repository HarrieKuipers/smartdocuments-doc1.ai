"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Volume2, Pause, Play, Square } from "lucide-react";
import { Button } from "@/components/ui/button";

type TTSStatus = "idle" | "playing" | "paused";

interface TextToSpeechProps {
  text: string;
  lang?: string;
  labels: {
    ttsPlay: string;
    ttsPlaying: string;
    ttsPause: string;
    ttsResume: string;
    ttsStop: string;
    ttsUnsupported: string;
  };
  brandPrimary?: string;
}

/**
 * Strips markdown/HTML formatting from text for cleaner speech output.
 */
function stripFormatting(text: string): string {
  return text
    // Remove HTML tags
    .replace(/<[^>]+>/g, "")
    // Remove markdown bold/italic
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/_(.+?)_/g, "$1")
    // Remove markdown links, keep text
    .replace(/\[(.+?)\]\(.+?\)/g, "$1")
    // Remove markdown headings
    .replace(/^#{1,6}\s+/gm, "")
    // Clean up extra whitespace
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Splits text into chunks that fit within the SpeechSynthesis character limit.
 * Splits on sentence boundaries to keep speech natural.
 */
function splitIntoChunks(text: string, maxLength = 200): string[] {
  const sentences = text.split(/(?<=[.!?;])\s+/);
  const chunks: string[] = [];
  let current = "";

  for (const sentence of sentences) {
    if (current.length + sentence.length + 1 > maxLength && current.length > 0) {
      chunks.push(current.trim());
      current = sentence;
    } else {
      current += (current ? " " : "") + sentence;
    }
  }
  if (current.trim()) {
    chunks.push(current.trim());
  }

  return chunks;
}

export default function TextToSpeech({
  text,
  lang = "nl-NL",
  labels,
  brandPrimary,
}: TextToSpeechProps) {
  const [status, setStatus] = useState<TTSStatus>("idle");
  const [supported, setSupported] = useState(true);
  const [progress, setProgress] = useState(0);
  const chunksRef = useRef<string[]>([]);
  const currentChunkRef = useRef(0);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      setSupported(false);
    }
    return () => {
      window.speechSynthesis?.cancel();
    };
  }, []);

  const speakChunk = useCallback(
    (index: number) => {
      const chunks = chunksRef.current;
      if (index >= chunks.length) {
        setStatus("idle");
        setProgress(0);
        currentChunkRef.current = 0;
        return;
      }

      const utterance = new SpeechSynthesisUtterance(chunks[index]);
      utterance.lang = lang;
      utterance.rate = 0.95;
      utterance.pitch = 1;

      // Try to find a Dutch voice
      const voices = window.speechSynthesis.getVoices();
      const langPrefix = lang.split("-")[0];
      const preferred = voices.find(
        (v) => v.lang.startsWith(langPrefix) && v.localService
      );
      const fallback = voices.find((v) => v.lang.startsWith(langPrefix));
      if (preferred) utterance.voice = preferred;
      else if (fallback) utterance.voice = fallback;

      utterance.onend = () => {
        const next = index + 1;
        currentChunkRef.current = next;
        setProgress(Math.round((next / chunks.length) * 100));
        speakChunk(next);
      };

      utterance.onerror = (e) => {
        // "interrupted" and "canceled" are expected when user stops/pauses
        if (e.error !== "interrupted" && e.error !== "canceled") {
          console.error("TTS error:", e.error);
          setStatus("idle");
          setProgress(0);
        }
      };

      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    },
    [lang]
  );

  const handlePlay = useCallback(() => {
    if (!supported) return;

    if (status === "paused") {
      window.speechSynthesis.resume();
      setStatus("playing");
      return;
    }

    // Start fresh
    window.speechSynthesis.cancel();
    const cleanText = stripFormatting(text);
    const chunks = splitIntoChunks(cleanText);
    chunksRef.current = chunks;
    currentChunkRef.current = 0;
    setProgress(0);
    setStatus("playing");

    // Voices may load asynchronously - wait briefly if none available
    if (window.speechSynthesis.getVoices().length === 0) {
      window.speechSynthesis.onvoiceschanged = () => {
        speakChunk(0);
      };
    } else {
      speakChunk(0);
    }
  }, [supported, status, text, speakChunk]);

  const handlePause = useCallback(() => {
    window.speechSynthesis.pause();
    setStatus("paused");
  }, []);

  const handleStop = useCallback(() => {
    window.speechSynthesis.cancel();
    setStatus("idle");
    setProgress(0);
    currentChunkRef.current = 0;
  }, []);

  if (!supported) return null;

  const isActive = status === "playing" || status === "paused";

  return (
    <div className="flex items-center gap-2">
      {status === "idle" && (
        <Button
          variant="outline"
          size="sm"
          onClick={handlePlay}
          className="gap-2 text-gray-600 hover:text-gray-900"
          style={brandPrimary ? {
            borderColor: `${brandPrimary}40`,
            color: brandPrimary,
          } : undefined}
          aria-label={labels.ttsPlay}
        >
          <Volume2 className="h-4 w-4" />
          <span className="hidden sm:inline">{labels.ttsPlay}</span>
        </Button>
      )}

      {isActive && (
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="icon-sm"
            onClick={status === "playing" ? handlePause : handlePlay}
            aria-label={status === "playing" ? labels.ttsPause : labels.ttsResume}
            style={brandPrimary ? {
              borderColor: `${brandPrimary}40`,
              color: brandPrimary,
            } : undefined}
          >
            {status === "playing" ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={handleStop}
            aria-label={labels.ttsStop}
            className="text-gray-500 hover:text-gray-700"
          >
            <Square className="h-3.5 w-3.5" />
          </Button>
          {progress > 0 && (
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-16 overflow-hidden rounded-full bg-gray-200 sm:w-24">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${progress}%`,
                    backgroundColor: brandPrimary || "#00BCD4",
                  }}
                />
              </div>
              <span className="text-xs text-gray-400">{progress}%</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

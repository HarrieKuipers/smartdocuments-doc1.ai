"use client";

import { useState, useRef, useCallback } from "react";
import { Volume2, Pause, Play, Square, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type TTSStatus = "idle" | "loading" | "playing" | "paused";

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
  shortId?: string;
}

/**
 * Strips markdown/HTML formatting from text for cleaner speech output.
 */
function stripFormatting(text: string): string {
  return text
    .replace(/<[^>]+>/g, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/_(.+?)_/g, "$1")
    .replace(/\[(.+?)\]\(.+?\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export default function TextToSpeech({
  text,
  lang = "nl-NL",
  labels,
  brandPrimary,
  shortId,
}: TextToSpeechProps) {
  const [status, setStatus] = useState<TTSStatus>("idle");
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const handlePlay = useCallback(async () => {
    if (status === "paused" && audioRef.current) {
      audioRef.current.play();
      setStatus("playing");
      return;
    }

    // Stop any existing playback
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    const cleanText = stripFormatting(text);
    if (!cleanText) return;

    // If no shortId, we can't call the API
    if (!shortId) return;

    setStatus("loading");
    setProgress(0);

    try {
      abortRef.current = new AbortController();

      const response = await fetch(`/api/reader/${shortId}/tts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: cleanText }),
        signal: abortRef.current.signal,
      });

      if (!response.ok) {
        throw new Error("TTS request failed");
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);

      audio.ontimeupdate = () => {
        if (audio.duration > 0) {
          setProgress(Math.round((audio.currentTime / audio.duration) * 100));
        }
      };

      audio.onended = () => {
        setStatus("idle");
        setProgress(0);
        URL.revokeObjectURL(audioUrl);
        audioRef.current = null;
      };

      audio.onerror = () => {
        console.error("Audio playback error");
        setStatus("idle");
        setProgress(0);
        URL.revokeObjectURL(audioUrl);
        audioRef.current = null;
      };

      audioRef.current = audio;
      await audio.play();
      setStatus("playing");
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      console.error("TTS error:", err);
      setStatus("idle");
      setProgress(0);
    }
  }, [status, text, shortId]);

  const handlePause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setStatus("paused");
    }
  }, []);

  const handleStop = useCallback(() => {
    abortRef.current?.abort();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    setStatus("idle");
    setProgress(0);
  }, []);

  const isActive = status === "playing" || status === "paused";

  return (
    <div className="flex items-center gap-2">
      {status === "idle" && (
        <Button
          variant="outline"
          size="sm"
          onClick={handlePlay}
          className="gap-2 text-gray-600 hover:text-gray-900"
          style={
            brandPrimary
              ? {
                  borderColor: `${brandPrimary}40`,
                  color: brandPrimary,
                }
              : undefined
          }
          aria-label={labels.ttsPlay}
        >
          <Volume2 className="h-4 w-4" />
          <span className="hidden sm:inline">{labels.ttsPlay}</span>
        </Button>
      )}

      {status === "loading" && (
        <Button
          variant="outline"
          size="sm"
          disabled
          className="gap-2 text-gray-500"
          style={
            brandPrimary
              ? {
                  borderColor: `${brandPrimary}40`,
                  color: brandPrimary,
                }
              : undefined
          }
        >
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="hidden sm:inline">Laden...</span>
        </Button>
      )}

      {isActive && (
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="icon-sm"
            onClick={status === "playing" ? handlePause : handlePlay}
            aria-label={
              status === "playing" ? labels.ttsPause : labels.ttsResume
            }
            style={
              brandPrimary
                ? {
                    borderColor: `${brandPrimary}40`,
                    color: brandPrimary,
                  }
                : undefined
            }
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

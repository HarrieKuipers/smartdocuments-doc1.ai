"use client";

import { useEffect, useState, useRef } from "react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  Loader2,
  AlertCircle,
  FileText,
  Wand2,
  Shield,
  BarChart3,
  Layers,
} from "lucide-react";

interface RewriteProgressProps {
  rewriteId: string;
  onComplete?: (data: { b1Score: number; versionNumber: number }) => void;
  onError?: (message: string) => void;
}

interface ProgressEvent {
  step: string;
  percentage: number;
  message?: string;
  error?: boolean;
  b1Score?: number;
  versionNumber?: number;
}

const STEP_ICONS: Record<string, React.ReactNode> = {
  "structure-extraction": <FileText className="size-4" />,
  "mcp-checks": <BarChart3 className="size-4" />,
  "ai-rewrite": <Wand2 className="size-4" />,
  "safety-check": <Shield className="size-4" />,
  reassemble: <Layers className="size-4" />,
  "diff-calculation": <Layers className="size-4" />,
  "b1-score": <BarChart3 className="size-4" />,
  complete: <CheckCircle2 className="size-4" />,
  error: <AlertCircle className="size-4" />,
};

export default function RewriteProgress({
  rewriteId,
  onComplete,
  onError,
}: RewriteProgressProps) {
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState("starting");
  const [message, setMessage] = useState("Pipeline starten...");
  const [isComplete, setIsComplete] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [steps, setSteps] = useState<
    Array<{ step: string; message: string; done: boolean }>
  >([]);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    // Start the pipeline via SSE
    const startPipeline = async () => {
      try {
        const response = await fetch(`/api/rewrites/${rewriteId}/process`, {
          method: "POST",
        });

        if (!response.ok) {
          const text = await response.text();
          setHasError(true);
          setMessage(text || "Er ging iets mis.");
          onError?.(text);
          return;
        }

        const reader = response.body?.getReader();
        if (!reader) return;

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const event: ProgressEvent = JSON.parse(line.slice(6));

                setProgress(event.percentage);
                setCurrentStep(event.step);
                if (event.message) setMessage(event.message);

                // Track completed steps
                if (event.step !== "starting") {
                  setSteps((prev) => {
                    const existing = prev.find((s) => s.step === event.step);
                    if (existing) {
                      return prev.map((s) =>
                        s.step === event.step
                          ? { ...s, message: event.message || s.message }
                          : s
                      );
                    }
                    // Mark previous steps as done
                    const updated = prev.map((s) => ({ ...s, done: true }));
                    updated.push({
                      step: event.step,
                      message: event.message || event.step,
                      done: event.step === "complete" || !!event.error,
                    });
                    return updated;
                  });
                }

                if (event.error) {
                  setHasError(true);
                  onError?.(event.message || "Onbekende fout");
                }

                if (event.step === "complete" && event.b1Score !== undefined) {
                  setIsComplete(true);
                  onComplete?.({
                    b1Score: event.b1Score,
                    versionNumber: event.versionNumber || 1,
                  });
                }
              } catch {
                // Skip non-JSON lines (heartbeats)
              }
            }
          }
        }
      } catch (error) {
        setHasError(true);
        setMessage("Verbinding verloren. Probeer opnieuw.");
        onError?.("Verbinding verloren");
      }
    };

    startPipeline();

    return () => {
      eventSourceRef.current?.close();
    };
  }, [rewriteId, onComplete, onError]);

  return (
    <div className="space-y-6">
      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">
            {isComplete
              ? "Voltooid"
              : hasError
                ? "Fout opgetreden"
                : "Bezig met herschrijven..."}
          </span>
          <span className="text-sm text-muted-foreground">{progress}%</span>
        </div>
        <Progress value={progress} />
      </div>

      {/* Current status */}
      <div
        className={`flex items-center gap-3 p-4 rounded-lg border ${
          hasError
            ? "border-destructive/30 bg-destructive/5"
            : isComplete
              ? "border-green-500/30 bg-green-50"
              : "border-primary/30 bg-primary/5"
        }`}
      >
        {hasError ? (
          <AlertCircle className="size-5 text-destructive" />
        ) : isComplete ? (
          <CheckCircle2 className="size-5 text-green-600" />
        ) : (
          <Loader2 className="size-5 text-primary animate-spin" />
        )}
        <span className="text-sm">{message}</span>
      </div>

      {/* Step list */}
      {steps.length > 0 && (
        <div className="space-y-2">
          {steps.map((step, idx) => (
            <div
              key={idx}
              className="flex items-center gap-3 text-sm"
            >
              <span className={step.done ? "text-green-600" : "text-primary"}>
                {STEP_ICONS[step.step] || (
                  <Loader2 className="size-4 animate-spin" />
                )}
              </span>
              <span
                className={
                  step.done ? "text-muted-foreground" : "text-foreground"
                }
              >
                {step.message}
              </span>
              {step.done && (
                <CheckCircle2 className="size-3.5 text-green-600 ml-auto" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

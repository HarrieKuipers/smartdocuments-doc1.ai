"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, Loader2, AlertCircle, ArrowRight } from "lucide-react";

interface ProgressData {
  status: string;
  step: string;
  percentage: number;
}

const STEPS = [
  {
    key: "text-extraction",
    label: "Tekstextractie",
    description: "Content uit het bestand halen",
  },
  {
    key: "content-analysis",
    label: "Inhoud Analyse",
    description: "AI analyseert structuur en kernthema's",
  },
  {
    key: "summary-generation",
    label: "Samenvatting Genereren",
    description: "Creëren van samenvattingen en hoofdpunten",
  },
  {
    key: "language-levels",
    label: "Taalniveaus Genereren",
    description: "Herschrijven op B1, B2 en C1 niveau",
  },
  {
    key: "term-extraction",
    label: "Begrippen Extractie",
    description: "Belangrijke termen en definities identificeren",
  },
  {
    key: "finalizing",
    label: "Afronding",
    description: "Smart Document wordt klaargemaakt",
  },
];

export default function ProcessingPage() {
  const params = useParams();
  const router = useRouter();
  const [progress, setProgress] = useState<ProgressData>({
    status: "processing",
    step: "text-extraction",
    percentage: 0,
  });

  useEffect(() => {
    const eventSource = new EventSource(
      `/api/documents/${params.id}/progress`
    );

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setProgress(data);

        if (data.status === "ready" || data.status === "error") {
          eventSource.close();
        }
      } catch {
        // ignore parse errors
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
      // Fallback to polling
      const pollInterval = setInterval(async () => {
        try {
          const res = await fetch(`/api/documents/${params.id}`);
          if (res.ok) {
            const { data } = await res.json();
            setProgress({
              status: data.status,
              step: data.processingProgress?.step || "",
              percentage: data.processingProgress?.percentage || 0,
            });
            if (data.status === "ready" || data.status === "error") {
              clearInterval(pollInterval);
            }
          }
        } catch {
          clearInterval(pollInterval);
        }
      }, 2000);

      return () => clearInterval(pollInterval);
    };

    return () => eventSource.close();
  }, [params.id]);

  const currentStepIndex = STEPS.findIndex((s) => s.key === progress.step);
  const isReady = progress.status === "ready";
  const isError = progress.status === "error";

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Document Verwerken</h1>
        <p className="text-muted-foreground">
          Je document wordt geanalyseerd door AI
        </p>
      </div>

      {/* Progress bar */}
      <div className="space-y-2">
        <Progress value={progress.percentage} className="h-3" />
        <p className="text-center text-sm font-medium">
          {progress.percentage}% voltooid
        </p>
      </div>

      {/* Steps */}
      <Card>
        <CardContent className="divide-y p-0">
          {STEPS.map((step, i) => {
            const isCompleted = i < currentStepIndex || isReady;
            const isCurrent = i === currentStepIndex && !isReady;

            return (
              <div
                key={step.key}
                className="flex items-center gap-4 p-4"
              >
                <div className="flex-shrink-0">
                  {isCompleted ? (
                    <CheckCircle className="h-6 w-6 text-green-500" />
                  ) : isCurrent ? (
                    <Loader2 className="h-6 w-6 animate-spin text-[#0062EB]" />
                  ) : (
                    <div className="h-6 w-6 rounded-full border-2 border-gray-200" />
                  )}
                </div>
                <div className="flex-1">
                  <p
                    className={`font-medium ${
                      isCompleted
                        ? "text-green-700"
                        : isCurrent
                        ? "text-[#0062EB]"
                        : "text-gray-400"
                    }`}
                  >
                    {step.label}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {step.description}
                  </p>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Status messages */}
      {!isReady && !isError && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="flex items-center gap-3 p-4">
            <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
            <div>
              <p className="font-medium text-blue-900">Even Geduld</p>
              <p className="text-sm text-blue-700">
                De AI verwerkt je document. Dit kan enkele minuten duren
                afhankelijk van de grootte van het document.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {isError && (
        <Card className="bg-red-50 border-red-200">
          <CardContent className="flex items-center gap-3 p-4">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <div>
              <p className="font-medium text-red-900">Fout bij verwerking</p>
              <p className="text-sm text-red-700">
                Er is een fout opgetreden. Probeer het opnieuw of neem contact op
                met support.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {isReady && (
        <div className="text-center">
          <Button
            size="lg"
            className="bg-[#0062EB] hover:bg-[#0050C0]"
            onClick={() =>
              router.push(`/dashboard/documents/${params.id}/edit`)
            }
          >
            Bekijk Resultaat
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

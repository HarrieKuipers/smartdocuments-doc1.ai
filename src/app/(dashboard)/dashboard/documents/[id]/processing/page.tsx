"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle,
  Loader2,
  AlertCircle,
  ArrowRight,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { useOnboarding } from "@/components/onboarding/OnboardingProvider";

interface ProgressData {
  status: string;
  step: string;
  percentage: number;
}

const SMART_STEPS = [
  {
    key: "text-extraction",
    label: "Tekstextractie",
    description: "Content uit het bestand halen",
    onboardingTip: "AI leest je document en haalt alle tekst eruit, inclusief tabellen en koppen.",
  },
  {
    key: "visual-extraction",
    label: "Visuele Content",
    description: "Tabellen, grafieken en diagrammen herkennen",
    onboardingTip: "AI scant je document op visuele content zoals tabellen en grafieken, en maakt deze doorzoekbaar.",
  },
  {
    key: "vectorization",
    label: "Vectorisatie",
    description: "Document indexeren voor AI-chat",
    onboardingTip: "Je document wordt opgedeeld in slimme fragmenten zodat de AI precies de juiste passages kan vinden.",
  },
  {
    key: "audience-analysis",
    label: "Doelgroep Analyse",
    description: "Documenttype en doelgroep bepalen",
    onboardingTip: "AI bepaalt voor wie het document bedoeld is en past de verwerking hierop aan.",
  },
  {
    key: "content-analysis",
    label: "Inhoud Analyse",
    description: "AI analyseert structuur en kernthema's",
    onboardingTip: "De structuur, onderwerpen en kernboodschappen worden geïdentificeerd.",
  },
  {
    key: "summary-generation",
    label: "Samenvatting Genereren",
    description: "Creëren van samenvattingen en hoofdpunten",
    onboardingTip: "AI maakt een heldere samenvatting met de belangrijkste punten uit je document.",
  },
  {
    key: "language-levels",
    label: "Taalniveaus Genereren",
    description: "Herschrijven op B1, B2 en C1 niveau",
    onboardingTip: "Je samenvatting wordt herschreven in verschillende taalniveaus zodat iedereen het kan begrijpen.",
  },
  {
    key: "term-extraction",
    label: "Begrippen Extractie",
    description: "Belangrijke termen en definities identificeren",
    onboardingTip: "Vakjargon wordt automatisch herkend. Lezers zien deze als tooltips met uitleg.",
  },
  {
    key: "cover-generation",
    label: "Coverafbeelding",
    description: "Visuele cover genereren voor het document",
    onboardingTip: "Er wordt automatisch een aantrekkelijke coverafbeelding voor je document gemaakt.",
  },
  {
    key: "finalizing",
    label: "Afronding",
    description: "Smart Document wordt klaargemaakt",
    onboardingTip: "Alles wordt samengevoegd tot je Smart Document, klaar om te publiceren!",
  },
];

export default function ProcessingPage() {
  const params = useParams();
  const router = useRouter();
  const { isFirstUpload } = useOnboarding();
  const documentId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [smartProgress, setSmartProgress] = useState<ProgressData>({
    status: "processing",
    step: "text-extraction",
    percentage: 0,
  });

  const smartReady = smartProgress.status === "ready";
  const smartError = smartProgress.status === "error";

  useEffect(() => {
    async function loadData() {
      try {
        const docRes = await fetch(`/api/documents/${documentId}`);
        if (docRes.ok) {
          const { data } = await docRes.json();
          setSmartProgress({
            status: data.status,
            step: data.processingProgress?.step || "text-extraction",
            percentage: data.processingProgress?.percentage || 0,
          });
        }
      } catch {
        toast.error("Kon document niet laden.");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [documentId]);

  // Smart Document SSE progress
  useEffect(() => {
    if (loading) return;

    const eventSource = new EventSource(
      `/api/documents/${documentId}/progress`
    );

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setSmartProgress(data);
        if (data.status === "ready" || data.status === "error") {
          eventSource.close();
        }
      } catch {
        // ignore
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
      const pollInterval = setInterval(async () => {
        try {
          const res = await fetch(`/api/documents/${documentId}`);
          if (res.ok) {
            const { data } = await res.json();
            setSmartProgress({
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
  }, [documentId, loading]);

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="h-8 w-64 bg-gray-200 animate-pulse rounded" />
        <div className="h-64 w-full bg-gray-200 animate-pulse rounded" />
      </div>
    );
  }

  const smartStepIndex = SMART_STEPS.findIndex(
    (s) => s.key === smartProgress.step
  );

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Document verwerken</h1>
        <p className="text-muted-foreground">
          Je document wordt geanalyseerd door AI
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5 text-[#0062EB]" />
            Smart Document
            {smartReady && (
              <CheckCircle className="h-5 w-5 text-green-500 ml-auto" />
            )}
            {smartError && (
              <AlertCircle className="h-5 w-5 text-red-500 ml-auto" />
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Progress bar */}
          <div className="space-y-2">
            <Progress value={smartProgress.percentage} className="h-3" />
            <p className="text-center text-sm font-medium">
              {smartProgress.percentage}% voltooid
            </p>
          </div>

          {/* Steps */}
          <div className="divide-y border rounded-lg">
            {SMART_STEPS.map((step, i) => {
              const isCompleted = i < smartStepIndex || smartReady;
              const isCurrent = i === smartStepIndex && !smartReady;

              return (
                <div key={step.key} className="flex items-center gap-4 p-3">
                  <div className="flex-shrink-0">
                    {isCompleted ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : isCurrent ? (
                      <Loader2 className="h-5 w-5 animate-spin text-[#0062EB]" />
                    ) : (
                      <div className="h-5 w-5 rounded-full border-2 border-gray-200" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p
                      className={`text-sm font-medium ${
                        isCompleted
                          ? "text-green-700"
                          : isCurrent
                            ? "text-[#0062EB]"
                            : "text-gray-400"
                      }`}
                    >
                      {step.label}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {step.description}
                    </p>
                    {isFirstUpload && isCurrent && step.onboardingTip && (
                      <p className="mt-1 text-xs text-[#0062EB]">
                        {step.onboardingTip}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {smartError && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-red-50 border border-red-200">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <p className="text-sm text-red-700">
                Er is een fout opgetreden bij het verwerken.
              </p>
            </div>
          )}

          {smartReady && (
            <div className="flex justify-center">
              <Button
                variant="outline"
                onClick={() =>
                  router.push(`/dashboard/documents/${documentId}/edit`)
                }
              >
                Bekijk Smart Document
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info / status messages */}
      {!smartReady && !smartError && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="flex items-center gap-3 p-4">
            <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
            <div>
              <p className="font-medium text-blue-900">Even Geduld</p>
              <p className="text-sm text-blue-700">
                De AI verwerkt je document. Dit kan enkele minuten duren afhankelijk van de grootte van het document.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {smartReady && (
        <div className="text-center">
          <Button
            size="lg"
            className="bg-[#0062EB] hover:bg-[#0050C0]"
            onClick={() =>
              router.push(`/dashboard/documents/${documentId}/edit`)
            }
          >
            Naar Document
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

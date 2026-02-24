"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  CheckCircle,
  Loader2,
  AlertCircle,
  ArrowRight,
  FileText,
  PenLine,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";
import RuleSelector from "@/components/rewrite/RuleSelector";
import RewriteProgress from "@/components/rewrite/RewriteProgress";
import { DEFAULT_SELECTED_RULES } from "@/types/rewrite";
import type { SchrijfwijzerRule } from "@/types/schrijfwijzer";

interface ProgressData {
  status: string;
  step: string;
  percentage: number;
}

interface SchrijfwijzerData {
  _id: string;
  name: string;
  description?: string;
  rules: SchrijfwijzerRule[];
  isDefault: boolean;
}

const SMART_STEPS = [
  {
    key: "text-extraction",
    label: "Tekstextractie",
    description: "Content uit het bestand halen",
  },
  {
    key: "audience-analysis",
    label: "Doelgroep Analyse",
    description: "Documenttype en doelgroep bepalen",
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
    key: "cover-generation",
    label: "Coverafbeelding",
    description: "Visuele cover genereren voor het document",
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
  const documentId = params.id as string;

  // Document info
  const [publicationTypes, setPublicationTypes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Smart Document progress
  const [smartProgress, setSmartProgress] = useState<ProgressData>({
    status: "processing",
    step: "text-extraction",
    percentage: 0,
  });

  // Rewrite state
  const [schrijfwijzers, setSchrijfwijzers] = useState<SchrijfwijzerData[]>([]);
  const [selectedSchrijfwijzerId, setSelectedSchrijfwijzerId] = useState("");
  const [selectedRules, setSelectedRules] = useState<number[]>(DEFAULT_SELECTED_RULES);
  const [preset, setPreset] = useState<string | undefined>();
  const [rewriteStarting, setRewriteStarting] = useState(false);
  const [rewriteId, setRewriteId] = useState<string | null>(null);
  const [rewriteComplete, setRewriteComplete] = useState(false);

  const hasSmart = publicationTypes.includes("smart");
  const hasHerziend = publicationTypes.includes("herziend");
  const smartReady = smartProgress.status === "ready";
  const smartError = smartProgress.status === "error";

  const activeSchrijfwijzer = schrijfwijzers.find(
    (sw) => sw._id === selectedSchrijfwijzerId
  );

  // Both pipelines done?
  const allDone =
    (!hasSmart || smartReady) && (!hasHerziend || rewriteComplete);

  useEffect(() => {
    async function loadData() {
      try {
        const [docRes, swRes] = await Promise.all([
          fetch(`/api/documents/${documentId}`),
          fetch("/api/schrijfwijzers"),
        ]);

        if (docRes.ok) {
          const { data } = await docRes.json();
          const types = data.publicationTypes?.length
            ? data.publicationTypes
            : ["smart"];
          setPublicationTypes(types);

          // Load schrijfwijzers for herziend
          if (types.includes("herziend")) {
            let swList = swRes.ok ? (await swRes.json()).data : [];

            if (!swList?.length) {
              await fetch("/api/schrijfwijzers", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ seed: true }),
              });
              const seeded = await fetch("/api/schrijfwijzers");
              if (seeded.ok) swList = (await seeded.json()).data;
            }

            if (swList?.length) {
              setSchrijfwijzers(swList);
              const docSwIds: string[] = data.schrijfwijzerIds || [];
              const firstMatch = docSwIds.find((id: string) =>
                swList.some((sw: SchrijfwijzerData) => sw._id === id)
              );
              if (firstMatch) {
                setSelectedSchrijfwijzerId(firstMatch);
              } else {
                const defaultSw = swList.find((sw: SchrijfwijzerData) => sw.isDefault);
                setSelectedSchrijfwijzerId(defaultSw?._id || swList[0]._id);
              }
            }
          }
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
    if (!hasSmart || loading) return;

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
  }, [documentId, hasSmart, loading]);

  async function startRewrite() {
    if (!activeSchrijfwijzer) return;
    setRewriteStarting(true);

    try {
      const res = await fetch("/api/rewrites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentId,
          schrijfwijzerId: activeSchrijfwijzer._id,
          selectedRules,
          preset,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }

      const { data: rewrite } = await res.json();
      setRewriteId(rewrite._id);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Kon rewrite niet starten."
      );
      setRewriteStarting(false);
    }
  }

  const handleRewriteComplete = useCallback(
    (data: { b1Score: number; versionNumber: number }) => {
      toast.success(`Herschrijving voltooid! B1-score: ${data.b1Score}%`);
      setRewriteComplete(true);
    },
    []
  );

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
        <h1 className="text-2xl font-bold">Document Verwerken</h1>
        <p className="text-muted-foreground">
          {hasSmart && hasHerziend
            ? "Je document wordt verwerkt als Smart Document én herschreven"
            : hasSmart
              ? "Je document wordt geanalyseerd door AI"
              : "Je document wordt herschreven"}
        </p>
      </div>

      {/* Smart Document Section */}
      {hasSmart && (
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
      )}

      {/* Herziend Document Section */}
      {hasHerziend && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <PenLine className="h-5 w-5 text-[#0062EB]" />
              Herziend Document
              {rewriteComplete && (
                <CheckCircle className="h-5 w-5 text-green-500 ml-auto" />
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {rewriteId ? (
              /* Rewrite pipeline running */
              <RewriteProgress
                rewriteId={rewriteId}
                onComplete={handleRewriteComplete}
                onError={(msg) => toast.error(msg)}
              />
            ) : (
              /* Rule selection before starting */
              <div className="space-y-4">
                {/* Schrijfwijzer picker */}
                {schrijfwijzers.length > 1 && (
                  <div className="max-w-sm">
                    <Label htmlFor="sw-select">Schrijfwijzer</Label>
                    <Select
                      value={selectedSchrijfwijzerId}
                      onValueChange={(id) => {
                        setSelectedSchrijfwijzerId(id);
                        setSelectedRules(DEFAULT_SELECTED_RULES);
                        setPreset(undefined);
                      }}
                    >
                      <SelectTrigger id="sw-select">
                        <SelectValue placeholder="Kies een schrijfwijzer" />
                      </SelectTrigger>
                      <SelectContent>
                        {schrijfwijzers.map((sw) => (
                          <SelectItem key={sw._id} value={sw._id}>
                            {sw.name}
                            {sw.isDefault ? " (standaard)" : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {activeSchrijfwijzer ? (
                  <RuleSelector
                    rules={activeSchrijfwijzer.rules}
                    selectedRules={selectedRules}
                    onSelectedRulesChange={setSelectedRules}
                    onPresetSelect={setPreset}
                    disabled={rewriteStarting}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Geen schrijfwijzer beschikbaar.
                  </p>
                )}

                <div className="flex justify-end">
                  <Button
                    onClick={startRewrite}
                    disabled={
                      rewriteStarting ||
                      !activeSchrijfwijzer ||
                      selectedRules.length === 0
                    }
                  >
                    {rewriteStarting ? (
                      <Loader2 className="size-4 mr-1.5 animate-spin" />
                    ) : (
                      <Wand2 className="size-4 mr-1.5" />
                    )}
                    Herschrijven starten ({selectedRules.length} regels)
                  </Button>
                </div>
              </div>
            )}

            {rewriteComplete && rewriteId && (
              <div className="flex justify-center">
                <Button
                  variant="outline"
                  onClick={() =>
                    router.push(
                      `/dashboard/documents/${documentId}/rewrite/${rewriteId}`
                    )
                  }
                >
                  Bekijk Herschrijving
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Info / status messages */}
      {!allDone && !smartError && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="flex items-center gap-3 p-4">
            <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
            <div>
              <p className="font-medium text-blue-900">Even Geduld</p>
              <p className="text-sm text-blue-700">
                {hasSmart && hasHerziend
                  ? "Je document wordt verwerkt. Je kunt de herschrijving al starten terwijl het Smart Document wordt aangemaakt."
                  : "De AI verwerkt je document. Dit kan enkele minuten duren afhankelijk van de grootte van het document."}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {allDone && (
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

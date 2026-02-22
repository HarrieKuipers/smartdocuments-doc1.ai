"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Loader2, Wand2 } from "lucide-react";
import { toast } from "sonner";
import RuleSelector from "@/components/rewrite/RuleSelector";
import RewriteProgress from "@/components/rewrite/RewriteProgress";
import { DEFAULT_SELECTED_RULES } from "@/types/rewrite";
import type { SchrijfwijzerRule } from "@/types/schrijfwijzer";

interface SchrijfwijzerData {
  _id: string;
  name: string;
  rules: SchrijfwijzerRule[];
}

export default function RewritePage() {
  const params = useParams();
  const router = useRouter();
  const documentId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [schrijfwijzer, setSchrijfwijzer] = useState<SchrijfwijzerData | null>(
    null
  );
  const [selectedRules, setSelectedRules] = useState<number[]>(
    DEFAULT_SELECTED_RULES
  );
  const [preset, setPreset] = useState<string | undefined>();
  const [starting, setStarting] = useState(false);
  const [rewriteId, setRewriteId] = useState<string | null>(null);
  const [documentTitle, setDocumentTitle] = useState("");

  useEffect(() => {
    loadData();
  }, [documentId]);

  const loadData = async () => {
    try {
      // Load document info
      const docRes = await fetch(`/api/documents/${documentId}`);
      if (docRes.ok) {
        const { data } = await docRes.json();
        setDocumentTitle(data.title);
      }

      // Load schrijfwijzers (seed if needed)
      let swRes = await fetch("/api/schrijfwijzers");
      let { data: schrijfwijzers } = await swRes.json();

      if (!schrijfwijzers?.length) {
        // Seed default schrijfwijzer
        await fetch("/api/schrijfwijzers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ seed: true }),
        });
        swRes = await fetch("/api/schrijfwijzers");
        const result = await swRes.json();
        schrijfwijzers = result.data;
      }

      if (schrijfwijzers?.length) {
        setSchrijfwijzer(schrijfwijzers[0]);
      }
    } catch {
      toast.error("Kon gegevens niet laden.");
    } finally {
      setLoading(false);
    }
  };

  const startRewrite = async () => {
    if (!schrijfwijzer) return;
    setStarting(true);

    try {
      const res = await fetch("/api/rewrites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentId,
          schrijfwijzerId: schrijfwijzer._id,
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
      setStarting(false);
    }
  };

  const handleComplete = (data: { b1Score: number; versionNumber: number }) => {
    toast.success(`Herschrijving voltooid! B1-score: ${data.b1Score}%`);
    router.push(
      `/dashboard/documents/${documentId}/rewrite/${rewriteId}`
    );
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-[400px]" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
        >
          <ArrowLeft className="size-4 mr-1.5" />
          Terug
        </Button>
        <div>
          <h1 className="text-xl font-semibold">Herschrijven</h1>
          <p className="text-sm text-muted-foreground">{documentTitle}</p>
        </div>
      </div>

      {rewriteId ? (
        /* Pipeline progress */
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Voortgang</CardTitle>
          </CardHeader>
          <CardContent>
            <RewriteProgress
              rewriteId={rewriteId}
              onComplete={handleComplete}
              onError={(msg) => toast.error(msg)}
            />
          </CardContent>
        </Card>
      ) : (
        /* Rule selection */
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Wand2 className="size-5" />
                Schrijfwijzer-regels
              </CardTitle>
              {schrijfwijzer && (
                <p className="text-sm text-muted-foreground">
                  {schrijfwijzer.name}
                </p>
              )}
            </CardHeader>
            <CardContent>
              {schrijfwijzer ? (
                <RuleSelector
                  rules={schrijfwijzer.rules}
                  selectedRules={selectedRules}
                  onSelectedRulesChange={setSelectedRules}
                  onPresetSelect={setPreset}
                  disabled={starting}
                />
              ) : (
                <p className="text-sm text-muted-foreground">
                  Geen schrijfwijzer beschikbaar.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Start button */}
          <div className="flex justify-end">
            <Button
              size="lg"
              onClick={startRewrite}
              disabled={
                starting || !schrijfwijzer || selectedRules.length === 0
              }
            >
              {starting ? (
                <Loader2 className="size-4 mr-1.5 animate-spin" />
              ) : (
                <Wand2 className="size-4 mr-1.5" />
              )}
              Herschrijven starten ({selectedRules.length} regels)
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

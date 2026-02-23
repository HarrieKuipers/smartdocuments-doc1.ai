"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Plus,
  Play,
  Pause,
  Trophy,
  FlaskConical,
} from "lucide-react";

interface ABTest {
  _id: string;
  name: string;
  documentA: { _id: string; title: string; shortId: string };
  documentB: { _id: string; title: string; shortId: string };
  status: "active" | "paused" | "completed";
  trafficSplit: number;
  goalMetric: string;
  winner?: "A" | "B" | null;
  startDate: string;
  endDate?: string;
  createdAt: string;
}

interface OrgDocument {
  _id: string;
  title: string;
  shortId: string;
}

const GOAL_LABELS: Record<string, string> = {
  views: "Views",
  readTime: "Leestijd",
  scrollDepth: "Scroll Diepte",
  completionRate: "Completie Rate",
  chatEngagement: "Chat Engagement",
};

const STATUS_LABELS: Record<string, string> = {
  active: "Actief",
  paused: "Gepauzeerd",
  completed: "Voltooid",
};

export default function ABTestsPage() {
  const router = useRouter();
  const [tests, setTests] = useState<ABTest[]>([]);
  const [documents, setDocuments] = useState<OrgDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [docA, setDocA] = useState("");
  const [docB, setDocB] = useState("");
  const [split, setSplit] = useState("50");
  const [goal, setGoal] = useState("completionRate");

  const fetchTests = useCallback(async () => {
    try {
      const res = await fetch("/api/analytics/ab-tests");
      if (res.ok) {
        const data = await res.json();
        setTests(data.tests || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchDocuments = useCallback(async () => {
    try {
      const res = await fetch("/api/analytics/overview?period=30d");
      if (res.ok) {
        const data = await res.json();
        setDocuments(
          data.documents?.map((d: { _id: string; title: string; shortId: string }) => ({
            _id: d._id,
            title: d.title,
            shortId: d.shortId,
          })) || []
        );
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchTests();
    fetchDocuments();
  }, [fetchTests, fetchDocuments]);

  async function handleCreate() {
    if (!name || !docA || !docB || docA === docB) return;
    setCreating(true);
    try {
      const res = await fetch("/api/analytics/ab-tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          documentA: docA,
          documentB: docB,
          trafficSplit: parseInt(split),
          goalMetric: goal,
        }),
      });
      if (res.ok) {
        setDialogOpen(false);
        setName("");
        setDocA("");
        setDocB("");
        setSplit("50");
        setGoal("completionRate");
        fetchTests();
      }
    } catch {
      // ignore
    } finally {
      setCreating(false);
    }
  }

  async function handleStatusChange(testId: string, status: string) {
    try {
      await fetch(`/api/analytics/ab-tests/${testId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      fetchTests();
    } catch {
      // ignore
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/dashboard/analytics")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">A/B Tests</h1>
            <p className="text-sm text-muted-foreground">
              Vergelijk de prestaties van twee documenten
            </p>
          </div>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nieuwe Test
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nieuwe A/B Test</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Test naam</Label>
                <Input
                  placeholder="Bijv. Nieuw ontwerp vs Oud"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Document A (Controle)</Label>
                <Select value={docA} onValueChange={setDocA}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecteer document" />
                  </SelectTrigger>
                  <SelectContent>
                    {documents.map((d) => (
                      <SelectItem key={d._id} value={d._id}>
                        {d.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Document B (Variant)</Label>
                <Select value={docB} onValueChange={setDocB}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecteer document" />
                  </SelectTrigger>
                  <SelectContent>
                    {documents
                      .filter((d) => d._id !== docA)
                      .map((d) => (
                        <SelectItem key={d._id} value={d._id}>
                          {d.title}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Traffic Split (% naar B)</Label>
                  <Select value={split} onValueChange={setSplit}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="20">20%</SelectItem>
                      <SelectItem value="30">30%</SelectItem>
                      <SelectItem value="50">50%</SelectItem>
                      <SelectItem value="70">70%</SelectItem>
                      <SelectItem value="80">80%</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Doel Metric</Label>
                  <Select value={goal} onValueChange={setGoal}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(GOAL_LABELS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button
                onClick={handleCreate}
                disabled={creating || !name || !docA || !docB || docA === docB}
                className="w-full"
              >
                {creating ? "Aanmaken..." : "Test Starten"}
              </Button>
              {docA === docB && docA && (
                <p className="text-xs text-red-500">
                  Selecteer twee verschillende documenten.
                </p>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tests List */}
      {tests.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FlaskConical className="mb-3 h-10 w-10 text-gray-300" />
            <p className="text-sm text-gray-500">
              Je hebt nog geen A/B tests. Maak een nieuwe test om de prestaties
              van twee documenten te vergelijken.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {tests.map((test) => (
            <ABTestCard
              key={test._id}
              test={test}
              onStatusChange={handleStatusChange}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ABTestCard({
  test,
  onStatusChange,
}: {
  test: ABTest;
  onStatusChange: (id: string, status: string) => void;
}) {
  const router = useRouter();
  const [results, setResults] = useState<{
    variantA: Record<string, number>;
    variantB: Record<string, number>;
    leading: string;
    improvement: number;
  } | null>(null);
  const [loadingResults, setLoadingResults] = useState(false);

  async function fetchResults() {
    if (results) return;
    setLoadingResults(true);
    try {
      const res = await fetch(`/api/analytics/ab-tests/${test._id}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data);
      }
    } catch {
      // ignore
    } finally {
      setLoadingResults(false);
    }
  }

  useEffect(() => {
    fetchResults();
  }, []);// eslint-disable-line react-hooks/exhaustive-deps

  const statusColor =
    test.status === "active"
      ? "bg-green-50 text-green-700 border-green-200"
      : test.status === "paused"
        ? "bg-yellow-50 text-yellow-700 border-yellow-200"
        : "bg-gray-50 text-gray-700 border-gray-200";

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle className="text-base font-semibold">
              {test.name}
            </CardTitle>
            <Badge variant="outline" className={statusColor}>
              {STATUS_LABELS[test.status]}
            </Badge>
            {test.winner && (
              <Badge className="bg-yellow-100 text-yellow-800">
                <Trophy className="mr-1 h-3 w-3" />
                Winnaar: Variant {test.winner}
              </Badge>
            )}
          </div>
          <div className="flex gap-2">
            {test.status === "active" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onStatusChange(test._id, "paused")}
              >
                <Pause className="mr-1 h-3 w-3" />
                Pauzeren
              </Button>
            )}
            {test.status === "paused" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onStatusChange(test._id, "active")}
              >
                <Play className="mr-1 h-3 w-3" />
                Hervatten
              </Button>
            )}
            {test.status !== "completed" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onStatusChange(test._id, "completed")}
              >
                <Trophy className="mr-1 h-3 w-3" />
                Afronden
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 md:grid-cols-2">
          {/* Variant A */}
          <div
            className="cursor-pointer rounded-lg border p-4 transition-colors hover:bg-gray-50"
            onClick={() =>
              router.push(
                `/dashboard/analytics/${test.documentA._id}`
              )
            }
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium text-gray-500">
                Variant A ({100 - test.trafficSplit}%)
              </span>
              {test.winner === "A" && (
                <Trophy className="h-4 w-4 text-yellow-500" />
              )}
            </div>
            <p className="text-sm font-semibold text-gray-900">
              {test.documentA.title}
            </p>
            {results && (
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-500">
                <div>
                  Views: <span className="font-medium text-gray-700">{results.variantA.views || 0}</span>
                </div>
                <div>
                  Completie: <span className="font-medium text-gray-700">{Math.round(results.variantA.completionRate || 0)}%</span>
                </div>
                <div>
                  Leestijd: <span className="font-medium text-gray-700">{Math.round(results.variantA.avgReadTime || 0)}s</span>
                </div>
                <div>
                  Chat: <span className="font-medium text-gray-700">{results.variantA.chatMessages || 0}</span>
                </div>
              </div>
            )}
            {loadingResults && <Skeleton className="mt-3 h-12" />}
          </div>

          {/* Variant B */}
          <div
            className="cursor-pointer rounded-lg border p-4 transition-colors hover:bg-gray-50"
            onClick={() =>
              router.push(
                `/dashboard/analytics/${test.documentB._id}`
              )
            }
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium text-gray-500">
                Variant B ({test.trafficSplit}%)
              </span>
              {test.winner === "B" && (
                <Trophy className="h-4 w-4 text-yellow-500" />
              )}
            </div>
            <p className="text-sm font-semibold text-gray-900">
              {test.documentB.title}
            </p>
            {results && (
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-500">
                <div>
                  Views: <span className="font-medium text-gray-700">{results.variantB.views || 0}</span>
                </div>
                <div>
                  Completie: <span className="font-medium text-gray-700">{Math.round(results.variantB.completionRate || 0)}%</span>
                </div>
                <div>
                  Leestijd: <span className="font-medium text-gray-700">{Math.round(results.variantB.avgReadTime || 0)}s</span>
                </div>
                <div>
                  Chat: <span className="font-medium text-gray-700">{results.variantB.chatMessages || 0}</span>
                </div>
              </div>
            )}
            {loadingResults && <Skeleton className="mt-3 h-12" />}
          </div>
        </div>

        {/* Results summary */}
        {results && results.leading && (
          <div className="mt-4 rounded-lg bg-blue-50 p-3 text-sm">
            <span className="font-medium text-blue-700">
              Variant {results.leading} leidt
            </span>
            <span className="text-blue-600">
              {" "}
              met {Math.round(results.improvement)}% betere{" "}
              {GOAL_LABELS[test.goalMetric]?.toLowerCase() || test.goalMetric}
            </span>
          </div>
        )}

        <div className="mt-3 flex gap-4 text-xs text-gray-400">
          <span>
            Gestart: {new Date(test.startDate).toLocaleDateString("nl-NL")}
          </span>
          {test.endDate && (
            <span>
              Beeindigd: {new Date(test.endDate).toLocaleDateString("nl-NL")}
            </span>
          )}
          <span>Doel: {GOAL_LABELS[test.goalMetric] || test.goalMetric}</span>
        </div>
      </CardContent>
    </Card>
  );
}

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { X, Loader2, ArrowLeft, GitCompareArrows } from "lucide-react";

interface ComparisonDocument {
  title: string;
  shortId: string;
}

interface ComparisonPosition {
  documentTitle: string;
  shortId: string;
  position: string;
}

interface ComparisonTheme {
  theme: string;
  positions: ComparisonPosition[];
}

interface DocumentCompareProps {
  collectionSlug: string;
  documents: ComparisonDocument[];
  brandPrimary: string;
  onClose: () => void;
}

// Soft distinct colors for document columns
const COLUMN_COLORS = [
  { bg: "bg-blue-50", border: "border-blue-200", badge: "bg-blue-100 text-blue-800" },
  { bg: "bg-amber-50", border: "border-amber-200", badge: "bg-amber-100 text-amber-800" },
  { bg: "bg-emerald-50", border: "border-emerald-200", badge: "bg-emerald-100 text-emerald-800" },
  { bg: "bg-purple-50", border: "border-purple-200", badge: "bg-purple-100 text-purple-800" },
  { bg: "bg-rose-50", border: "border-rose-200", badge: "bg-rose-100 text-rose-800" },
  { bg: "bg-cyan-50", border: "border-cyan-200", badge: "bg-cyan-100 text-cyan-800" },
];

export default function DocumentCompare({
  collectionSlug,
  documents,
  brandPrimary,
  onClose,
}: DocumentCompareProps) {
  const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set());
  const [comparing, setComparing] = useState(false);
  const [result, setResult] = useState<{
    documents: ComparisonDocument[];
    themes: ComparisonTheme[];
  } | null>(null);
  const [error, setError] = useState("");

  function toggleDoc(shortId: string) {
    setSelectedDocs((prev) => {
      const next = new Set(prev);
      if (next.has(shortId)) {
        next.delete(shortId);
      } else {
        if (next.size >= 6) return prev;
        next.add(shortId);
      }
      return next;
    });
  }

  async function handleCompare() {
    if (selectedDocs.size < 2) return;
    setComparing(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch(
        `/api/reader/collections/${collectionSlug}/compare`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ documentIds: Array.from(selectedDocs) }),
        }
      );

      if (!res.ok) {
        const body = await res.json();
        setError(body.error || "Vergelijking mislukt.");
        return;
      }

      const { data } = await res.json();
      setResult(data);
    } catch {
      setError("Kon vergelijking niet uitvoeren. Probeer het opnieuw.");
    } finally {
      setComparing(false);
    }
  }

  // Build a color map for result documents
  const docColorMap = new Map<string, (typeof COLUMN_COLORS)[0]>();
  if (result) {
    result.documents.forEach((doc, i) => {
      docColorMap.set(doc.shortId, COLUMN_COLORS[i % COLUMN_COLORS.length]);
    });
  }

  // If we have results, show the comparison view
  if (result) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setResult(null)}>
              <ArrowLeft className="mr-1 h-4 w-4" />
              Terug
            </Button>
            <div>
              <h2 className="text-xl font-bold">Documentvergelijking</h2>
              <p className="text-sm text-muted-foreground">
                {result.documents.length} documenten &middot;{" "}
                {result.themes.length} thema&apos;s
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Document legend */}
        <div className="flex flex-wrap gap-2">
          {result.documents.map((doc) => {
            const color = docColorMap.get(doc.shortId)!;
            return (
              <Badge key={doc.shortId} className={`${color.badge} text-xs`}>
                {doc.title}
              </Badge>
            );
          })}
        </div>

        {/* Themes */}
        <div className="space-y-4">
          {result.themes.map((theme, themeIdx) => (
            <Card key={themeIdx} className="overflow-hidden">
              <div
                className="px-4 py-3 font-semibold text-white"
                style={{ backgroundColor: brandPrimary }}
              >
                {theme.theme}
              </div>
              <CardContent className="p-0">
                {/* Desktop: grid layout */}
                <div
                  className="hidden md:grid"
                  style={{
                    gridTemplateColumns: `repeat(${result.documents.length}, 1fr)`,
                  }}
                >
                  {result.documents.map((doc) => {
                    const color = docColorMap.get(doc.shortId)!;
                    const pos = theme.positions.find(
                      (p) => p.shortId === doc.shortId
                    );
                    return (
                      <div
                        key={doc.shortId}
                        className={`border-r last:border-r-0 p-4 ${color.bg}`}
                      >
                        <p className="mb-2 text-xs font-semibold text-muted-foreground">
                          {doc.title}
                        </p>
                        <p className="text-sm leading-relaxed">
                          {pos?.position || "Niet behandeld"}
                        </p>
                      </div>
                    );
                  })}
                </div>

                {/* Mobile: stacked layout */}
                <div className="space-y-0 divide-y md:hidden">
                  {result.documents.map((doc) => {
                    const color = docColorMap.get(doc.shortId)!;
                    const pos = theme.positions.find(
                      (p) => p.shortId === doc.shortId
                    );
                    return (
                      <div
                        key={doc.shortId}
                        className={`p-4 ${color.bg}`}
                      >
                        <Badge className={`${color.badge} mb-2 text-xs`}>
                          {doc.title}
                        </Badge>
                        <p className="text-sm leading-relaxed">
                          {pos?.position || "Niet behandeld"}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Back button at bottom */}
        <div className="flex justify-center pb-4">
          <Button variant="outline" onClick={() => setResult(null)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Nieuwe vergelijking
          </Button>
        </div>
      </div>
    );
  }

  // Selection view
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Documenten vergelijken</h2>
          <p className="text-sm text-muted-foreground">
            Selecteer 2 tot 6 documenten om naast elkaar te vergelijken per
            thema.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Document selection */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {documents.map((doc) => {
          const isSelected = selectedDocs.has(doc.shortId);
          return (
            <button
              key={doc.shortId}
              onClick={() => toggleDoc(doc.shortId)}
              className={`rounded-xl border-2 p-4 text-left transition-all ${
                isSelected
                  ? "border-current shadow-md"
                  : "border-transparent bg-white hover:border-gray-200"
              }`}
              style={isSelected ? { borderColor: brandPrimary } : undefined}
            >
              <p className="text-sm font-medium line-clamp-2">{doc.title}</p>
              {isSelected && (
                <Badge
                  className="mt-2 text-xs text-white"
                  style={{ backgroundColor: brandPrimary }}
                >
                  Geselecteerd
                </Badge>
              )}
            </button>
          );
        })}
      </div>

      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}

      {/* Action */}
      <div className="flex items-center gap-3">
        <Button
          onClick={handleCompare}
          disabled={selectedDocs.size < 2 || comparing}
          style={{ backgroundColor: brandPrimary }}
          className="text-white hover:opacity-90"
        >
          {comparing ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <GitCompareArrows className="mr-2 h-4 w-4" />
          )}
          {comparing
            ? "Vergelijking wordt gegenereerd..."
            : `Vergelijk ${selectedDocs.size} documenten`}
        </Button>
        <span className="text-sm text-muted-foreground">
          {selectedDocs.size}/6 geselecteerd
        </span>
      </div>
    </div>
  );
}

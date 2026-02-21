"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  TooltipProvider,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  FileText,
  Download,
  Calendar,
  User,
  BookOpen,
  CheckCircle,
  BarChart3,
  MessageSquare,
} from "lucide-react";
import PasswordGate from "@/components/reader/PasswordGate";
import ChatWidget from "@/components/chat/ChatWidget";

interface ReaderDocument {
  _id: string;
  shortId: string;
  title: string;
  authors: string[];
  description?: string;
  publicationDate?: string;
  version?: string;
  pageCount?: number;
  tags: string[];
  sourceFile: { url: string; filename: string };
  content: {
    summary: { original: string; B1: string; B2: string; C1: string };
    keyPoints: { text: string; linkedTerms: string[] }[];
    findings: { category: string; title: string; content: string }[];
    terms: { term: string; definition: string; occurrences: number }[];
  };
  brandOverride?: { primary?: string };
  organization: {
    name: string;
    slug: string;
    logo?: string;
    brandColors: { primary: string; secondary: string; accent: string };
  };
}

type LanguageLevel = "original" | "B1" | "B2" | "C1";

export default function ReaderPage() {
  const params = useParams();
  const [doc, setDoc] = useState<ReaderDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsPassword, setNeedsPassword] = useState(false);
  const [languageLevel, setLanguageLevel] = useState<LanguageLevel>("original");
  const [error, setError] = useState("");

  async function fetchDocument(password?: string) {
    try {
      const headers: Record<string, string> = {};
      if (password) headers["x-document-password"] = password;

      const res = await fetch(`/api/reader/${params.shortId}`, { headers });

      if (res.status === 401) {
        const data = await res.json();
        if (data.requiresPassword) {
          setNeedsPassword(true);
          setLoading(false);
          return;
        }
      }

      if (!res.ok) {
        setError("Document niet gevonden of nog niet gepubliceerd.");
        setLoading(false);
        return;
      }

      const { data } = await res.json();
      setDoc(data);
      setNeedsPassword(false);
    } catch {
      setError("Kon document niet laden.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchDocument();
  }, [params.shortId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-5xl p-8">
          <Skeleton className="mb-6 h-16 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (needsPassword) {
    return <PasswordGate onUnlock={(pw) => fetchDocument(pw)} />;
  }

  if (error || !doc) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <FileText className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <p className="font-medium">{error || "Document niet gevonden."}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const brandPrimary =
    doc.brandOverride?.primary ||
    doc.organization?.brandColors?.primary ||
    "#00BCD4";

  const currentSummary =
    languageLevel === "original"
      ? doc.content.summary.original
      : doc.content.summary[languageLevel] || doc.content.summary.original;

  const estimatedReadTime = Math.max(
    1,
    Math.round((currentSummary?.length || 0) / 1000)
  );

  function highlightTerms(text: string) {
    if (!doc?.content.terms?.length) return text;
    let result = text;
    // Simple highlight - replace terms with styled spans
    doc.content.terms.forEach((t) => {
      const regex = new RegExp(`\\b(${t.term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})\\b`, "gi");
      result = result.replace(
        regex,
        `<span class="cursor-help border-b border-dotted" style="border-color: ${brandPrimary}; color: ${brandPrimary}" title="${t.definition}">$1</span>`
      );
    });
    return result;
  }

  return (
    <div
      className="brand-themed min-h-screen bg-gray-50"
      style={
        {
          "--doc-brand-primary": brandPrimary,
        } as React.CSSProperties
      }
    >
      {/* Header */}
      <header
        className="border-b bg-white"
        style={{ borderBottomColor: brandPrimary }}
      >
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            {doc.organization?.logo ? (
              <img
                src={doc.organization.logo}
                alt={doc.organization.name}
                className="h-8"
              />
            ) : (
              <div
                className="flex h-8 w-8 items-center justify-center rounded-lg text-white text-sm font-bold"
                style={{ backgroundColor: brandPrimary }}
              >
                {doc.organization?.name?.[0] || "D"}
              </div>
            )}
            <span className="font-medium text-gray-700">
              {doc.organization?.name}
            </span>
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="bg-white border-b">
        <div className="mx-auto max-w-5xl px-6 py-12">
          <div className="flex gap-8">
            <div className="flex-1">
              {doc.tags?.[0] && (
                <Badge
                  className="mb-4"
                  style={{ backgroundColor: brandPrimary, color: "white" }}
                >
                  {doc.tags[0]}
                </Badge>
              )}
              <h1 className="mb-4 text-3xl font-bold text-gray-900">
                {doc.title}
              </h1>
              {doc.description && (
                <p className="mb-6 text-lg text-muted-foreground">
                  {doc.description}
                </p>
              )}
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                {doc.authors?.[0] && (
                  <span className="flex items-center gap-1">
                    <User className="h-4 w-4" />
                    {doc.authors.join(", ")}
                  </span>
                )}
                {doc.publicationDate && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {new Date(doc.publicationDate).toLocaleDateString("nl-NL")}
                  </span>
                )}
                {doc.pageCount && (
                  <span className="flex items-center gap-1">
                    <BookOpen className="h-4 w-4" />
                    {doc.pageCount} pagina&apos;s
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <FileText className="h-4 w-4" />~{estimatedReadTime} min. leestijd
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-5xl px-6 py-8">
        <div className="flex gap-8">
          {/* Left sidebar */}
          <aside className="hidden w-64 flex-shrink-0 lg:block">
            <div className="sticky top-8 space-y-6">
              <div className="space-y-3">
                {doc.authors?.[0] && (
                  <div>
                    <p className="text-xs font-medium uppercase text-muted-foreground">
                      Auteur
                    </p>
                    <p className="text-sm">{doc.authors.join(", ")}</p>
                  </div>
                )}
                {doc.publicationDate && (
                  <div>
                    <p className="text-xs font-medium uppercase text-muted-foreground">
                      Datum
                    </p>
                    <p className="text-sm">
                      {new Date(doc.publicationDate).toLocaleDateString("nl-NL", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                )}
                {doc.version && (
                  <div>
                    <p className="text-xs font-medium uppercase text-muted-foreground">
                      Versie
                    </p>
                    <p className="text-sm">{doc.version}</p>
                  </div>
                )}
                {doc.pageCount && (
                  <div>
                    <p className="text-xs font-medium uppercase text-muted-foreground">
                      Pagina&apos;s
                    </p>
                    <p className="text-sm">{doc.pageCount}</p>
                  </div>
                )}
              </div>

              <Separator />

              <div className="flex flex-wrap gap-1">
                {doc.tags?.map((tag, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>

              <Button
                variant="outline"
                className="w-full"
                onClick={() => window.open(doc.sourceFile.url, "_blank")}
              >
                <Download className="mr-2 h-4 w-4" />
                Download PDF
              </Button>

              {/* Language level switcher */}
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase text-muted-foreground">
                  Taalniveau
                </p>
                <div className="grid grid-cols-2 gap-1">
                  {(["original", "B1", "B2", "C1"] as const).map((level) => (
                    <button
                      key={level}
                      onClick={() => setLanguageLevel(level)}
                      className={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                        languageLevel === level
                          ? "text-white"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                      style={
                        languageLevel === level
                          ? { backgroundColor: brandPrimary }
                          : undefined
                      }
                    >
                      {level === "original" ? "Origineel" : level}
                    </button>
                  ))}
                </div>
              </div>

              {/* Table of contents */}
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase text-muted-foreground">
                  Inhoud
                </p>
                <nav className="space-y-1">
                  <a
                    href="#samenvatting"
                    className="block text-sm text-muted-foreground hover:text-gray-900"
                  >
                    Samenvatting
                  </a>
                  <a
                    href="#hoofdpunten"
                    className="block text-sm text-muted-foreground hover:text-gray-900"
                  >
                    Hoofdpunten
                  </a>
                  <a
                    href="#bevindingen"
                    className="block text-sm text-muted-foreground hover:text-gray-900"
                  >
                    Belangrijke Bevindingen
                  </a>
                </nav>
              </div>
            </div>
          </aside>

          {/* Main content */}
          <main className="min-w-0 flex-1 space-y-8">
            {/* Summary */}
            <section id="samenvatting">
              <div className="flex items-center gap-2 mb-4">
                <FileText
                  className="h-5 w-5"
                  style={{ color: brandPrimary }}
                />
                <h2 className="text-xl font-bold">Samenvatting</h2>
                {languageLevel !== "original" && (
                  <Badge
                    style={{ backgroundColor: brandPrimary, color: "white" }}
                  >
                    {languageLevel} Taalniveau
                  </Badge>
                )}
              </div>
              <div className="rounded-lg border bg-white p-6">
                <div
                  className="prose prose-sm max-w-none leading-relaxed"
                  dangerouslySetInnerHTML={{
                    __html: highlightTerms(currentSummary),
                  }}
                />
              </div>
            </section>

            {/* Key Points */}
            {doc.content.keyPoints?.length > 0 && (
              <section id="hoofdpunten">
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle
                    className="h-5 w-5"
                    style={{ color: brandPrimary }}
                  />
                  <h2 className="text-xl font-bold">Hoofdpunten</h2>
                </div>
                <div className="rounded-lg border bg-white p-6">
                  <ul className="space-y-3">
                    {doc.content.keyPoints.map((kp, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <div
                          className="mt-1 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-white"
                          style={{ backgroundColor: brandPrimary }}
                        >
                          <CheckCircle className="h-3 w-3" />
                        </div>
                        <span
                          className="text-sm leading-relaxed"
                          dangerouslySetInnerHTML={{
                            __html: highlightTerms(kp.text),
                          }}
                        />
                      </li>
                    ))}
                  </ul>
                </div>
              </section>
            )}

            {/* Findings */}
            {doc.content.findings?.length > 0 && (
              <section id="bevindingen">
                <div className="flex items-center gap-2 mb-4">
                  <BarChart3
                    className="h-5 w-5"
                    style={{ color: brandPrimary }}
                  />
                  <h2 className="text-xl font-bold">
                    Belangrijke Bevindingen
                  </h2>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {doc.content.findings.map((f, i) => (
                    <Card key={i}>
                      <CardContent className="p-5">
                        <Badge
                          variant="outline"
                          className="mb-3"
                          style={{ borderColor: brandPrimary, color: brandPrimary }}
                        >
                          {f.category}
                        </Badge>
                        <h3 className="mb-2 font-semibold">{f.title}</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {f.content}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            )}
          </main>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t bg-white py-6">
        <div className="mx-auto max-w-5xl px-6 text-center text-sm text-muted-foreground">
          Mogelijk gemaakt door{" "}
          <a
            href="https://doc1.ai"
            className="font-medium"
            style={{ color: brandPrimary }}
          >
            doc1.ai
          </a>{" "}
          — Een product van{" "}
          <a
            href="https://espire.agency"
            className="font-medium hover:underline"
          >
            Espire Agency
          </a>
        </div>
      </footer>

      {/* Chat Widget */}
      <ChatWidget documentId={doc._id} brandPrimary={brandPrimary} />
    </div>
  );
}

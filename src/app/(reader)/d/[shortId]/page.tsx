"use client";

import { useEffect, useState, useRef, useCallback } from "react";
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
  Settings,
} from "lucide-react";
import Link from "next/link";
import PasswordGate from "@/components/reader/PasswordGate";
import ChatWidget, { type ChatWidgetRef } from "@/components/chat/ChatWidget";
import { getTemplate, type TemplateId } from "@/lib/templates";
import DefaultHeader from "@/components/reader/headers/DefaultHeader";
import RijksoverheidHeader from "@/components/reader/headers/RijksoverheidHeader";
import AmsterdamHeader from "@/components/reader/headers/AmsterdamHeader";
import TemplateInfoBox from "@/components/reader/TemplateInfoBox";
import DocFooter from "@/components/reader/DocFooter";

interface ReaderDocument {
  _id: string;
  shortId: string;
  organizationId: string;
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
  template?: string;
  coverImageUrl?: string;
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
  const [isOwner, setIsOwner] = useState(false);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const chatRef = useRef<ChatWidgetRef>(null);

  // Handle clicks on highlighted terms in the content
  const handleTermClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.hasAttribute("data-term")) {
      e.preventDefault();
      const term = target.getAttribute("data-term") || target.textContent;
      chatRef.current?.askQuestion(
        `Kun je uitleggen wat "${term}" betekent in de context van dit document?`
      );
    }
  }, []);

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
      setDocumentId(data._id);
      setNeedsPassword(false);

      // Check if current user owns this document
      try {
        const sessionRes = await fetch("/api/auth/session");
        if (sessionRes.ok) {
          const session = await sessionRes.json();
          if (session?.user?.organizationId && session.user.organizationId === data.organizationId) {
            setIsOwner(true);
          }
        }
      } catch {
        // Not logged in or session fetch failed — ignore
      }
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

  const template = getTemplate(doc.template);
  const brandPrimary =
    doc.brandOverride?.primary ||
    template.primary;

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
    // Highlight terms - clickable to ask AI for definition
    doc.content.terms.forEach((t) => {
      const escaped = t.term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const escapedDef = t.definition.replace(/"/g, '&quot;');
      const regex = new RegExp(`\\b(${escaped})\\b`, "gi");
      result = result.replace(
        regex,
        `<span class="cursor-pointer border-b border-dotted hover:opacity-80 transition-opacity" style="border-color: ${brandPrimary}; color: ${brandPrimary}" data-term="${escaped}" title="${escapedDef}">$1</span>`
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
      {template.headerStyle === "split-bar" && template.logo ? (
        <RijksoverheidHeader title={doc.title} brandPrimary={brandPrimary} logo={template.logo} />
      ) : template.headerStyle === "inline-logo" && template.logo ? (
        <AmsterdamHeader title={doc.title} brandPrimary={brandPrimary} logo={template.logo} />
      ) : (
        <DefaultHeader organization={doc.organization} brandPrimary={brandPrimary} />
      )}

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
            {doc.coverImageUrl && (
              <div className="hidden md:block w-64 flex-shrink-0">
                <div className="overflow-hidden rounded-lg shadow-lg">
                  <img
                    src={doc.coverImageUrl}
                    alt={doc.title}
                    className="w-full"
                  />
                </div>
              </div>
            )}
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

              {/* B1 language button (template-specific) */}
              {template.showB1Button && (
                <button
                  onClick={() => setLanguageLevel("B1")}
                  className={`flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold text-white transition-colors ${
                    languageLevel === "B1"
                      ? "bg-emerald-600"
                      : "bg-emerald-500 hover:bg-emerald-600"
                  }`}
                >
                  <BookOpen className="h-4 w-4" />
                  B1 Taalniveau
                </button>
              )}

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
              <div className="rounded-lg border bg-white p-6" onClick={handleTermClick}>
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
                <div className="rounded-lg border bg-white p-6" onClick={handleTermClick}>
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

            {/* Template info box */}
            {template.showInfoBox && (
              <TemplateInfoBox
                brandPrimary={brandPrimary}
                primaryLight={template.primaryLight}
                label={template.infoBoxLabel}
              />
            )}
          </main>
        </div>
      </div>

      {/* Footer */}
      <DocFooter brandPrimary={brandPrimary} />

      {/* Chat Widget */}
      <ChatWidget ref={chatRef} documentId={doc._id} brandPrimary={brandPrimary} />
    </div>
  );
}

"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FileText,
  Download,
  Calendar,
  User,
  BookOpen,
  CheckCircle,
  BarChart3,
  Hash,
} from "lucide-react";
import PasswordGate from "@/components/reader/PasswordGate";
import ChatWidget, { type ChatWidgetRef } from "@/components/chat/ChatWidget";
import { getTemplate } from "@/lib/templates";
import DefaultHeader from "@/components/reader/headers/DefaultHeader";
import RijksoverheidHeader from "@/components/reader/headers/RijksoverheidHeader";
import AmsterdamHeader from "@/components/reader/headers/AmsterdamHeader";
import TemplateInfoBox from "@/components/reader/TemplateInfoBox";
import DocFooter from "@/components/reader/DocFooter";
import { useDocumentAnalytics } from "@/hooks/useDocumentAnalytics";

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
  chatMode?: "terms-only" | "terms-and-chat" | "full";
  languageLevel?: "B1" | "B2" | "C1";
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
  const [error, setError] = useState("");
  const [isOwner, setIsOwner] = useState(false);
  const chatRef = useRef<ChatWidgetRef>(null);
  const analytics = useDocumentAnalytics(doc?._id || "");

  const handleTermClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.hasAttribute("data-term")) {
      e.preventDefault();
      const term = target.getAttribute("data-term") || target.textContent || "";
      const definition = target.getAttribute("title") || "";
      analytics.trackTermClick(term, definition);

      if (doc?.chatMode === "full") {
        // Full AI mode: ask AI for contextual explanation
        chatRef.current?.askQuestion(
          `Kun je uitleggen wat "${term}" betekent in de context van dit document?`
        );
      } else {
        // terms-only and terms-and-chat: show predefined definition directly - no AI call
        chatRef.current?.showTermDefinition(term, definition);
      }
    }
  }, [analytics, doc?.chatMode]);

  async function fetchDocument(password?: string) {
    try {
      const headers: Record<string, string> = {};
      if (password) headers["x-document-password"] = password;

      const res = await fetch(`/api/reader/${params.shortId}?v=${Date.now()}`, {
        headers,
        cache: "no-store",
      });

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

      try {
        const sessionRes = await fetch("/api/auth/session");
        if (sessionRes.ok) {
          const session = await sessionRes.json();
          if (session?.user?.organizationId && session.user.organizationId === data.organizationId) {
            setIsOwner(true);
          }
        }
      } catch {
        // Not logged in — ignore
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
      <div className="min-h-screen bg-[#F5F7FA]">
        {/* Header skeleton */}
        <div className="sticky top-0 z-50 border-b bg-white shadow-sm">
          <div className="mx-auto flex max-w-[1400px] items-center px-6 py-4">
            <Skeleton className="h-7 w-64" />
          </div>
        </div>
        <div className="mx-auto max-w-[1400px] px-4 py-6 md:px-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
            {/* Sidebar skeleton */}
            <aside className="order-2 lg:order-1">
              <div className="rounded-xl bg-white p-6 shadow-sm">
                <Skeleton className="mb-5 w-full rounded-lg" style={{ aspectRatio: "210/297" }} />
                <div className="space-y-3">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-28" />
                </div>
                <Skeleton className="mt-4 h-10 w-full rounded-md" />
              </div>
            </aside>
            {/* Content skeleton */}
            <main className="order-1 space-y-6 lg:order-2">
              <div className="rounded-xl bg-white p-8 shadow-sm">
                <Skeleton className="mb-4 h-8 w-48" />
                <div className="space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                </div>
              </div>
              <div className="rounded-xl bg-white p-8 shadow-sm">
                <Skeleton className="mb-4 h-8 w-40" />
                <div className="space-y-3">
                  <Skeleton className="h-12 w-full rounded-lg" />
                  <Skeleton className="h-12 w-full rounded-lg" />
                  <Skeleton className="h-12 w-full rounded-lg" />
                </div>
              </div>
            </main>
          </div>
        </div>
      </div>
    );
  }

  if (needsPassword) {
    return <PasswordGate onUnlock={(pw) => fetchDocument(pw)} />;
  }

  if (error || !doc) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F5F7FA]">
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
  const brandPrimary = doc.brandOverride?.primary || template.primary;
  const primaryLight = template.primaryLight;

  const languageLevel: LanguageLevel = doc.languageLevel || "original";

  const currentSummary =
    languageLevel === "original"
      ? doc.content.summary.original
      : doc.content.summary[languageLevel] || doc.content.summary.original;

  function highlightTerms(text: string) {
    if (!doc?.content.terms?.length) return text;

    // Build a lookup map and a single combined regex to avoid sequential replacement issues
    const termMap = new Map<string, { term: string; definition: string }>();
    const escapedTerms: string[] = [];

    // Sort by length descending so longer terms match first (e.g. "arbeidsovereenkomst" before "arbeid")
    const sorted = [...doc.content.terms].sort((a, b) => b.term.length - a.term.length);

    for (const t of sorted) {
      const escaped = t.term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      termMap.set(t.term.toLowerCase(), t);
      escapedTerms.push(escaped);
    }

    if (escapedTerms.length === 0) return text;

    const regex = new RegExp(`\\b(${escapedTerms.join("|")})\\b`, "gi");
    return text.replace(regex, (match) => {
      const entry = termMap.get(match.toLowerCase());
      if (!entry) return match;
      const escapedDef = entry.definition.replace(/"/g, '&quot;');
      return `<span class="cursor-pointer border-b border-dotted hover:opacity-80 transition-opacity" style="border-color: ${brandPrimary}; color: ${brandPrimary}" data-term="${entry.term}" title="${escapedDef}">${match}</span>`;
    });
  }

  return (
    <div
      className="brand-themed min-h-screen bg-[#F5F7FA]"
      style={{ "--doc-brand-primary": brandPrimary } as React.CSSProperties}
    >
      {/* Header */}
      {template.headerStyle === "split-bar" && template.logo ? (
        <RijksoverheidHeader title={doc.title} brandPrimary={brandPrimary} logo={template.logo} />
      ) : template.headerStyle === "inline-logo" && template.logo ? (
        <AmsterdamHeader title={doc.title} brandPrimary={brandPrimary} logo={template.logo} />
      ) : (
        <DefaultHeader title={doc.title} organization={doc.organization} brandPrimary={brandPrimary} />
      )}

      {/* Main layout: sidebar + content (matching reference HTML) */}
      <div className="mx-auto max-w-[1400px] px-4 py-6 md:px-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
          {/* Sidebar */}
          <aside className="order-2 lg:order-1">
            <div className="sticky top-[80px] space-y-4">
              {/* Cover + Metadata Card */}
              <div className="rounded-2xl bg-white p-5 shadow-sm">
                {/* Cover Image */}
                {doc.coverImageUrl && (
                  <div
                    className="mb-5 overflow-hidden rounded-xl"
                    style={{ aspectRatio: "210/297" }}
                  >
                    <img
                      src={doc.coverImageUrl}
                      alt={doc.title}
                      className="h-full w-full object-cover"
                    />
                  </div>
                )}

                {/* Metadata */}
                <div className="space-y-3">
                  {doc.authors?.[0] && (
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-50">
                        <User className="h-3.5 w-3.5 text-gray-400" />
                      </div>
                      <div>
                        <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400">Auteur</p>
                        <p className="text-sm text-gray-700">{doc.authors.join(", ")}</p>
                      </div>
                    </div>
                  )}
                  {doc.publicationDate && (
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-50">
                        <Calendar className="h-3.5 w-3.5 text-gray-400" />
                      </div>
                      <div>
                        <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400">Datum</p>
                        <p className="text-sm text-gray-700">{new Date(doc.publicationDate).toLocaleDateString("nl-NL")}</p>
                      </div>
                    </div>
                  )}
                  {doc.version && (
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-50">
                        <Hash className="h-3.5 w-3.5 text-gray-400" />
                      </div>
                      <div>
                        <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400">Versie</p>
                        <p className="text-sm text-gray-700">{doc.version}</p>
                      </div>
                    </div>
                  )}
                  {doc.pageCount && (
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-50">
                        <FileText className="h-3.5 w-3.5 text-gray-400" />
                      </div>
                      <div>
                        <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400">Pagina&apos;s</p>
                        <p className="text-sm text-gray-700">{doc.pageCount}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Tags */}
                {doc.tags?.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-1.5 border-t border-gray-100 pt-4">
                    {doc.tags.map((tag, i) => (
                      <span
                        key={i}
                        className="inline-block rounded-full px-3 py-1 text-xs font-medium"
                        style={{ backgroundColor: primaryLight, color: brandPrimary }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Download Button */}
                <Button
                  variant="outline"
                  className="mt-4 w-full rounded-xl"
                  onClick={() => {
                    analytics.trackDownload();
                    window.open(doc.sourceFile.url, "_blank");
                  }}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download PDF
                </Button>
              </div>

              {/* Language Level Card (read-only) */}
              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <p className="mb-3 text-[11px] font-medium uppercase tracking-wider text-gray-400">
                  Taalniveau
                </p>

                <div
                  className="flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white"
                  style={{ backgroundColor: brandPrimary }}
                >
                  <BookOpen className="h-4 w-4" />
                  {languageLevel === "original" ? "Origineel" : `${languageLevel} Taalniveau`}
                </div>
              </div>
            </div>
          </aside>

          {/* Main content */}
          <main className="order-1 space-y-6 lg:order-2">
            {/* Summary */}
            <section id="samenvatting" className="rounded-xl bg-white p-6 shadow-sm md:p-8">
              <h2 className="mb-4 flex items-center gap-2 text-xl font-bold text-gray-900 md:text-2xl">
                <FileText className="h-6 w-6 md:h-7 md:w-7" style={{ color: brandPrimary }} />
                Samenvatting
                {languageLevel !== "original" && (
                  <Badge style={{ backgroundColor: brandPrimary, color: "white" }}>
                    {languageLevel} Taalniveau
                  </Badge>
                )}
              </h2>
              <div onClick={handleTermClick}>
                <div
                  className="prose max-w-none text-gray-700"
                  style={{ fontSize: "1.05rem", lineHeight: "1.8" }}
                  dangerouslySetInnerHTML={{ __html: highlightTerms(currentSummary) }}
                />
              </div>
            </section>

            {/* Key Points */}
            {doc.content.keyPoints?.length > 0 && (
              <section id="hoofdpunten" className="rounded-xl bg-white p-6 shadow-sm md:p-8">
                <h2 className="mb-6 flex items-center gap-2 text-xl font-bold text-gray-900 md:text-2xl">
                  <CheckCircle className="h-6 w-6 md:h-7 md:w-7" style={{ color: brandPrimary }} />
                  Hoofdpunten
                </h2>
                <div className="space-y-3" onClick={handleTermClick}>
                  {doc.content.keyPoints.map((kp, i) => (
                    <div
                      key={i}
                      className="flex gap-4 rounded-2xl border border-gray-100 bg-white p-5 transition-all hover:border-gray-200 hover:shadow-md"
                    >
                      <span
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
                        style={{ backgroundColor: brandPrimary }}
                      >
                        {i + 1}
                      </span>
                      <span
                        className="text-sm leading-relaxed text-gray-700 pt-1"
                        dangerouslySetInnerHTML={{ __html: highlightTerms(kp.text) }}
                      />
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Findings */}
            {doc.content.findings?.length > 0 && (
              <section id="bevindingen" className="rounded-xl bg-white p-6 shadow-sm md:p-8">
                <h2 className="mb-6 flex items-center gap-2 text-xl font-bold text-gray-900 md:text-2xl">
                  <BarChart3 className="h-6 w-6 md:h-7 md:w-7" style={{ color: brandPrimary }} />
                  Belangrijke Bevindingen
                </h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  {doc.content.findings.map((f, i) => (
                    <div
                      key={i}
                      className="group rounded-2xl border border-gray-100 bg-white p-6 transition-all hover:border-gray-200 hover:shadow-md"
                    >
                      <span
                        className="mb-3 inline-block rounded-full px-3 py-1 text-xs font-medium"
                        style={{ backgroundColor: primaryLight, color: brandPrimary }}
                      >
                        {f.category}
                      </span>
                      <h3 className="mb-2 text-base font-semibold text-gray-900 leading-snug">
                        {f.title}
                      </h3>
                      <p className="text-sm leading-relaxed text-gray-500">
                        {f.content}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Template info box */}
            {template.showInfoBox && (
              <TemplateInfoBox
                brandPrimary={brandPrimary}
                primaryLight={primaryLight}
                label={template.infoBoxLabel}
              />
            )}
          </main>
        </div>
      </div>

      {/* Footer */}
      <DocFooter brandPrimary={brandPrimary} />

      {/* Chat Widget */}
      <ChatWidget
        ref={chatRef}
        documentId={doc._id}
        brandPrimary={brandPrimary}
        chatMode={doc.chatMode || "terms-only"}
        terms={doc.content.terms}
      />
    </div>
  );
}

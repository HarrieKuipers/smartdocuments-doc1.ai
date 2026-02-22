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
  const chatRef = useRef<ChatWidgetRef>(null);

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
        <div className="mx-auto max-w-[1400px] p-8">
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

  const currentSummary =
    languageLevel === "original"
      ? doc.content.summary.original
      : doc.content.summary[languageLevel] || doc.content.summary.original;

  function highlightTerms(text: string) {
    if (!doc?.content.terms?.length) return text;
    let result = text;
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
            <div className="sticky top-[80px] rounded-xl bg-white p-6 shadow-sm">
              {/* Cover Image (A4 aspect ratio like reference) */}
              {doc.coverImageUrl && (
                <div
                  className="mb-5 overflow-hidden rounded-lg shadow-md"
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
              <div className="space-y-2 text-sm text-gray-600">
                {doc.authors?.[0] && (
                  <div>
                    <strong className="inline-flex items-center gap-1 text-xs">
                      <User className="h-3.5 w-3.5" /> Auteur:
                    </strong>{" "}
                    {doc.authors.join(", ")}
                  </div>
                )}
                {doc.publicationDate && (
                  <div>
                    <strong className="inline-flex items-center gap-1 text-xs">
                      <Calendar className="h-3.5 w-3.5" /> Datum:
                    </strong>{" "}
                    {new Date(doc.publicationDate).toLocaleDateString("nl-NL")}
                  </div>
                )}
                {doc.version && (
                  <div>
                    <strong className="inline-flex items-center gap-1 text-xs">
                      <Hash className="h-3.5 w-3.5" /> Versie:
                    </strong>{" "}
                    {doc.version}
                  </div>
                )}
                {doc.pageCount && (
                  <div>
                    <strong className="inline-flex items-center gap-1 text-xs">
                      <FileText className="h-3.5 w-3.5" /> Pagina&apos;s:
                    </strong>{" "}
                    {doc.pageCount}
                  </div>
                )}
                {doc.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-2">
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
              </div>

              {/* Download Button */}
              <Button
                variant="outline"
                className="mt-4 w-full"
                onClick={() => window.open(doc.sourceFile.url, "_blank")}
              >
                <Download className="mr-2 h-4 w-4" />
                Download PDF
              </Button>

              {/* B1 language button (template-specific) */}
              {template.showB1Button && (
                <button
                  onClick={() => setLanguageLevel("B1")}
                  className={`mt-3 flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold text-white shadow-sm transition-all ${
                    languageLevel === "B1"
                      ? "bg-emerald-600"
                      : "bg-emerald-500 hover:bg-emerald-600 hover:-translate-y-0.5"
                  }`}
                >
                  <BookOpen className="h-4 w-4" />
                  B1 Taalniveau
                </button>
              )}

              {/* Language level switcher */}
              <div className="mt-4 space-y-2">
                <p className="text-xs font-medium uppercase text-gray-500">
                  Taalniveau
                </p>
                <div className="grid grid-cols-2 gap-1">
                  {(["original", "B1", "B2", "C1"] as const).map((level) => (
                    <button
                      key={level}
                      onClick={() => setLanguageLevel(level)}
                      className={`rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
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
                <h2 className="mb-4 flex items-center gap-2 text-xl font-bold text-gray-900 md:text-2xl">
                  <CheckCircle className="h-6 w-6 md:h-7 md:w-7" style={{ color: brandPrimary }} />
                  Hoofdpunten
                </h2>
                <ul className="space-y-3" onClick={handleTermClick}>
                  {doc.content.keyPoints.map((kp, i) => (
                    <li
                      key={i}
                      className="relative rounded-lg bg-gray-50 py-3 pl-14 pr-4"
                    >
                      <span
                        className="absolute left-5 top-1/2 -translate-y-1/2 text-lg font-bold"
                        style={{ color: brandPrimary }}
                      >
                        ✓
                      </span>
                      <span
                        className="text-sm leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: highlightTerms(kp.text) }}
                      />
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Findings */}
            {doc.content.findings?.length > 0 && (
              <section id="bevindingen" className="rounded-xl bg-white p-6 shadow-sm md:p-8">
                <h2 className="mb-4 flex items-center gap-2 text-xl font-bold text-gray-900 md:text-2xl">
                  <BarChart3 className="h-6 w-6 md:h-7 md:w-7" style={{ color: brandPrimary }} />
                  Belangrijke Bevindingen
                </h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  {doc.content.findings.map((f, i) => (
                    <div
                      key={i}
                      className="rounded-xl p-5"
                      style={{
                        background: `linear-gradient(135deg, ${primaryLight}, white)`,
                        borderLeft: `4px solid ${brandPrimary}`,
                      }}
                    >
                      <h4
                        className="mb-2 text-sm font-semibold"
                        style={{ color: brandPrimary }}
                      >
                        {f.category}
                      </h4>
                      <h3 className="mb-1 font-medium text-gray-900">{f.title}</h3>
                      <p className="text-sm leading-relaxed text-gray-600">
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
      <ChatWidget ref={chatRef} documentId={doc._id} brandPrimary={brandPrimary} />
    </div>
  );
}

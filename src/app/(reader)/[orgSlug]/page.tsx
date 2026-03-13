"use client";

import { useEffect, useState, useRef, useCallback, lazy, Suspense } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FileText,
  Download,
  Calendar,
  User,
  CheckCircle,
  BarChart3,
  Hash,
  Eye,
  ChevronDown,
  Loader2,
} from "lucide-react";
import PasswordGate from "@/components/reader/PasswordGate";
import ChatWidget, { type ChatWidgetRef } from "@/components/chat/ChatWidget";
import { getTemplate, type TemplateConfig } from "@/lib/templates";
import { getLangStrings, type DocumentLanguage } from "@/lib/ai/language";
import DefaultHeader from "@/components/reader/headers/DefaultHeader";
import RijksoverheidHeader from "@/components/reader/headers/RijksoverheidHeader";
import AmsterdamHeader from "@/components/reader/headers/AmsterdamHeader";
import TemplateInfoBox from "@/components/reader/TemplateInfoBox";
import DocFooter from "@/components/reader/DocFooter";
import SectionFeedbackButton from "@/components/reader/SectionFeedbackButton";
import { useDocumentAnalytics } from "@/hooks/useDocumentAnalytics";
import ReactMarkdown from "react-markdown";

const PdfViewer = lazy(() => import("@/components/reader/PdfViewer"));

interface ReaderDocument {
  _id: string;
  shortId: string;
  organizationId: string;
  title: string;
  displayTitle?: string;
  authors: string[];
  description?: string;
  publicationDate?: string;
  version?: string;
  pageCount?: number;
  tags: string[];
  sourceFile: { url: string; filename: string; mimeType?: string };
  content: {
    summary: { original: string; B1: string; B2: string; C1: string };
    keyPoints: { text: string; explanation?: string; linkedTerms: string[] }[];
    findings: { category: string; title: string; content: string }[];
    terms: { term: string; definition: string; occurrences: number }[];
  };
  audienceContext?: {
    documentType: string;
    audience: string;
    isExternal: boolean;
  };
  language?: DocumentLanguage;
  template?: string;
  templateConfig?: TemplateConfig;
  chatMode?: "terms-only" | "terms-and-chat" | "full";
  infoBoxLabel?: string;
  infoBoxText?: string;
  languageLevel?: "B1" | "B2" | "C1" | "C2";
  targetCEFRLevel?: "B1" | "B2" | "C1" | "C2";
  coverImageUrl?: string;
  customCoverUrl?: string;
  brandOverride?: { primary?: string };
  organization: {
    name: string;
    slug: string;
    logo?: string;
    brandColors: { primary: string; secondary: string; accent: string };
  };
}

type LanguageLevel = "original" | "B1" | "B2" | "C1" | "C2";

function formatShortDate(dateStr: string, lang: string): string {
  const d = new Date(dateStr);
  const day = d.getDate();
  const month = d.toLocaleDateString(lang === "en" ? "en-GB" : "nl-NL", { month: "short" }).replace(".", "").toLowerCase();
  const year = String(d.getFullYear()).slice(2);
  return `${day} ${month} '${year}`;
}

export default function ReaderPage() {
  const params = useParams();
  const [doc, setDoc] = useState<ReaderDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsPassword, setNeedsPassword] = useState(false);
  const [error, setError] = useState("");
  const [isOwner, setIsOwner] = useState(false);
  const [showPdfViewer, setShowPdfViewer] = useState(false);
  const [expandedKeyPoint, setExpandedKeyPoint] = useState<number | null>(null);
  const [keyPointExplanations, setKeyPointExplanations] = useState<Record<number, string>>({});
  const [loadingKeyPoint, setLoadingKeyPoint] = useState<number | null>(null);
  const [expandedFinding, setExpandedFinding] = useState<number | null>(null);
  const [findingExplanations, setFindingExplanations] = useState<Record<number, string>>({});
  const [loadingFinding, setLoadingFinding] = useState<number | null>(null);
  const [coverIsLandscape, setCoverIsLandscape] = useState<boolean | null>(null);
  const chatRef = useRef<ChatWidgetRef>(null);
  const analytics = useDocumentAnalytics(doc?._id || "");

  const fetchExplanation = useCallback(async (
    documentId: string,
    prompt: string,
    type: "keypoint" | "finding",
    index: number,
  ) => {
    if (type === "keypoint") {
      setLoadingKeyPoint(index);
    } else {
      setLoadingFinding(index);
    }

    try {
      const res = await fetch(`/api/documents/${documentId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: prompt, history: [] }),
      });

      if (!res.ok) throw new Error();
      const { data } = await res.json();

      if (type === "keypoint") {
        setKeyPointExplanations((prev) => ({ ...prev, [index]: data.response }));
      } else {
        setFindingExplanations((prev) => ({ ...prev, [index]: data.response }));
      }
    } catch {
      const fallback = getLangStrings(doc?.language || "nl").reader.couldNotLoad;
      if (type === "keypoint") {
        setKeyPointExplanations((prev) => ({ ...prev, [index]: fallback }));
      } else {
        setFindingExplanations((prev) => ({ ...prev, [index]: fallback }));
      }
    } finally {
      if (type === "keypoint") {
        setLoadingKeyPoint(null);
      } else {
        setLoadingFinding(null);
      }
    }
  }, []);

  const toggleKeyPoint = useCallback((index: number) => {
    if (expandedKeyPoint === index) {
      setExpandedKeyPoint(null);
      return;
    }
    setExpandedKeyPoint(index);
    if (!keyPointExplanations[index] && doc) {
      const kp = doc.content.keyPoints[index];
      if (kp.explanation) {
        setKeyPointExplanations((prev) => ({ ...prev, [index]: kp.explanation! }));
      } else {
        const kpPrompt = doc.language === "en"
          ? `Explain the following key point from the document "${doc.title}" in 2-3 sentences. Provide more context and background. Key point: "${kp.text}"`
          : `Leg het volgende hoofdpunt uit het document "${doc.title}" verder uit in 2-3 zinnen. Geef meer context en achtergrond. Hoofdpunt: "${kp.text}"`;
        fetchExplanation(doc._id, kpPrompt, "keypoint", index);
      }
    }
  }, [expandedKeyPoint, keyPointExplanations, doc, fetchExplanation]);

  const toggleFinding = useCallback((index: number) => {
    if (expandedFinding === index) {
      setExpandedFinding(null);
      return;
    }
    setExpandedFinding(index);
    if (!findingExplanations[index] && doc) {
      const f = doc.content.findings[index];
      const fPrompt = doc.language === "en"
        ? `Provide more context and explanation about the following finding from the document "${doc.title}" in 2-3 sentences. Do NOT repeat the title or add a heading — start directly with the explanation. Category: "${f.category}". Title: "${f.title}". Content: "${f.content}"`
        : `Geef meer context en uitleg over de volgende bevinding uit het document "${doc.title}" in 2-3 zinnen. Herhaal NIET de titel en gebruik geen kopjes — begin direct met de uitleg. Categorie: "${f.category}". Titel: "${f.title}". Inhoud: "${f.content}"`;
      fetchExplanation(doc._id, fPrompt, "finding", index);
    }
  }, [expandedFinding, findingExplanations, doc, fetchExplanation]);

  const handleTermClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.hasAttribute("data-term")) {
      e.preventDefault();
      const term = target.getAttribute("data-term") || target.textContent || "";
      const definition = target.getAttribute("title") || "";
      analytics.trackTermClick(term, definition);

      if (doc?.chatMode === "full") {
        // Full AI mode: ask AI for contextual explanation
        const termQ = doc.language === "en"
          ? `Can you explain what "${term}" means in the context of this document?`
          : `Kun je uitleggen wat "${term}" betekent in de context van dit document?`;
        chatRef.current?.askQuestion(termQ);
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

      const res = await fetch(`/api/reader/${params.orgSlug}?v=${Date.now()}`, {
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
  }, [params.orgSlug]);

  // Detect cover image orientation
  useEffect(() => {
    const coverUrl = doc?.customCoverUrl || doc?.coverImageUrl;
    if (!coverUrl) return;
    const img = new Image();
    img.onload = () => setCoverIsLandscape(img.naturalWidth > img.naturalHeight);
    img.src = coverUrl;
  }, [doc?.customCoverUrl, doc?.coverImageUrl]);

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
    return <PasswordGate onUnlock={(pw) => fetchDocument(pw)} lang="nl" />;
  }

  if (error || !doc) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F5F7FA]" role="alert">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <FileText className="mx-auto mb-4 h-12 w-12 text-muted-foreground" aria-hidden="true" />
            <p className="font-medium">{error || "Document niet gevonden."}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const template = doc.templateConfig || getTemplate(doc.template);
  const brandPrimary = doc.brandOverride?.primary || template.primary;
  const primaryLight = template.primaryLight;
  const t = getLangStrings(doc.language || "nl").reader;
  const docLang = doc.language || "nl";

  // targetCEFRLevel = the level the content was rewritten to (user-set)
  // languageLevel = the detected level of the original PDF
  // For display: show targetCEFRLevel if set, otherwise languageLevel
  const displayLevel: LanguageLevel = doc.targetCEFRLevel || doc.languageLevel || "original";

  const summaryKey = displayLevel !== "original" && displayLevel !== "C2" ? displayLevel : null;
  const currentSummary = summaryKey
    ? doc.content.summary[summaryKey] || doc.content.summary.original
    : doc.content.summary.original;

  function formatParagraphs(html: string): string {
    // Split on double newlines and wrap each paragraph in <p> tags
    return html
      .split(/\n\n+/)
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p) => `<p>${p.replace(/\n/g, " ")}</p>`)
      .join("");
  }

  function highlightTerms(text: string) {
    if (!doc?.content.terms?.length) return formatParagraphs(text);

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

    if (escapedTerms.length === 0) return formatParagraphs(text);

    const regex = new RegExp(`\\b(${escapedTerms.join("|")})\\b`, "gi");
    const highlighted = text.replace(regex, (match) => {
      const entry = termMap.get(match.toLowerCase());
      if (!entry) return match;
      const escapedDef = entry.definition.replace(/\n/g, ' ').replace(/"/g, '&quot;');
      return `<span class="cursor-pointer border-b border-dotted hover:opacity-80 transition-opacity" style="border-color: ${brandPrimary}; color: ${brandPrimary}" data-term="${entry.term}" title="${escapedDef}">${match}</span>`;
    });
    return formatParagraphs(highlighted);
  }

  return (
    <div
      className="brand-themed min-h-screen bg-[#F5F7FA]"
      style={{ "--doc-brand-primary": brandPrimary } as React.CSSProperties}
      lang={docLang === "en" ? "en" : "nl"}
    >
      {/* WCAG: Skip navigation link */}
      <a href="#samenvatting" className="skip-link">
        {docLang === "en" ? "Skip to main content" : "Ga naar hoofdinhoud"}
      </a>
      {/* Header — show displayTitle (communicative) or fall back to title */}
      {(() => {
        const headerTitle = doc.displayTitle || doc.title;
        return template.headerStyle === "split-bar" && template.logo ? (
          <RijksoverheidHeader title={headerTitle} brandPrimary={brandPrimary} logo={template.logo} />
        ) : template.headerStyle === "inline-logo" && template.logo ? (
          <AmsterdamHeader title={headerTitle} brandPrimary={brandPrimary} logo={template.logo} />
        ) : (
          <DefaultHeader title={headerTitle} organization={doc.organization} brandPrimary={brandPrimary} />
        );
      })()}

      {/* Main layout: sidebar + content (matching reference HTML) */}
      <div className="mx-auto max-w-[1400px] px-4 py-6 md:px-6">
        {/* Cluster 1: Title, Cover, Download/View — mobile only (above content) */}
        <div className="mb-6 lg:hidden">
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            {coverIsLandscape && (doc.customCoverUrl || doc.coverImageUrl) ? (
              /* Landscape cover: full-width image, then title + meta + buttons below */
              <>
                <div className="mb-4 overflow-hidden rounded-xl bg-gray-100">
                  <img
                    src={doc.customCoverUrl || doc.coverImageUrl}
                    alt={doc.title}
                    className="h-auto w-full block"
                  />
                </div>
                <h2 className="text-sm font-semibold text-gray-900 leading-snug line-clamp-3">
                  {doc.title}
                </h2>
                <div className="mt-1.5 space-y-0.5 text-xs text-gray-500">
                  {doc.authors?.[0] && (
                    <div className="flex items-center gap-1">
                      <User className="h-3 w-3 shrink-0 text-gray-400" aria-hidden="true" />
                      <span className="truncate">{doc.authors.join(", ")}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    {doc.pageCount && (
                      <span className="flex items-center gap-1">
                        <FileText className="h-3 w-3 text-gray-400" aria-hidden="true" />
                        {doc.pageCount} pag.
                      </span>
                    )}
                    {doc.publicationDate && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-gray-400" aria-hidden="true" />
                        {formatShortDate(doc.publicationDate, docLang)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 rounded-xl text-xs"
                    onClick={() => {
                      analytics.trackDownload();
                      window.open(`/api/reader/${doc.shortId}/pdf?download=true`, "_blank");
                    }}
                  >
                    <Download className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                    {t.downloadPdf}
                  </Button>
                  <Button
                    variant={showPdfViewer ? "default" : "outline"}
                    size="sm"
                    className="rounded-xl"
                    style={showPdfViewer ? { backgroundColor: brandPrimary } : {}}
                    onClick={() => setShowPdfViewer(!showPdfViewer)}
                    title="PDF bekijken"
                  >
                    <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                  </Button>
                </div>
              </>
            ) : (
              /* Portrait cover (or no cover): thumbnail left, info right */
              <div className="flex gap-4">
                {(doc.customCoverUrl || doc.coverImageUrl) && (
                  <div className="shrink-0 w-28 overflow-hidden rounded-lg bg-gray-100">
                    <img
                      src={doc.customCoverUrl || doc.coverImageUrl}
                      alt={doc.title}
                      className="h-auto w-full object-cover"
                    />
                  </div>
                )}

                <div className="flex min-w-0 flex-1 flex-col justify-between">
                  <div>
                    <h2 className="text-sm font-semibold text-gray-900 leading-snug line-clamp-3">
                      {doc.title}
                    </h2>
                    <div className="mt-1.5 space-y-0.5 text-xs text-gray-500">
                      {doc.authors?.[0] && (
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3 shrink-0 text-gray-400" aria-hidden="true" />
                          <span className="truncate">{doc.authors.join(", ")}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        {doc.pageCount && (
                          <span className="flex items-center gap-1">
                            <FileText className="h-3 w-3 text-gray-400" aria-hidden="true" />
                            {doc.pageCount} pag.
                          </span>
                        )}
                        {doc.publicationDate && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-gray-400" aria-hidden="true" />
                            {formatShortDate(doc.publicationDate, docLang)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 rounded-xl text-xs"
                      onClick={() => {
                        analytics.trackDownload();
                        window.open(`/api/reader/${doc.shortId}/pdf?download=true`, "_blank");
                      }}
                    >
                      <Download className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                      {t.downloadPdf}
                    </Button>
                    <Button
                      variant={showPdfViewer ? "default" : "outline"}
                      size="sm"
                      className="rounded-xl"
                      style={showPdfViewer ? { backgroundColor: brandPrimary } : {}}
                      onClick={() => setShowPdfViewer(!showPdfViewer)}
                      title="PDF bekijken"
                    >
                      <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
          {/* Sidebar */}
          <aside className="order-2 lg:order-1" aria-label={docLang === "en" ? "Document information" : "Documentinformatie"}>
            <div className="sticky top-[80px] space-y-4">
              {/* Cluster 1: Title, Cover, Download/View — desktop only */}
              <div className="hidden lg:block rounded-2xl bg-white p-5 shadow-sm">
                <h2 className="mb-4 text-sm font-semibold text-gray-900 leading-snug">
                  {doc.title}
                </h2>

                {(doc.customCoverUrl || doc.coverImageUrl) && (
                  <div className="mb-4 overflow-hidden rounded-xl bg-gray-100">
                    <img
                      src={doc.customCoverUrl || doc.coverImageUrl}
                      alt={doc.title}
                      className="w-full h-auto max-h-80 object-contain block"
                    />
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 rounded-xl"
                    onClick={() => {
                      analytics.trackDownload();
                      window.open(`/api/reader/${doc.shortId}/pdf?download=true`, "_blank");
                    }}
                  >
                    <Download className="mr-2 h-4 w-4" aria-hidden="true" />
                    {t.downloadPdf}
                  </Button>
                  <Button
                    variant={showPdfViewer ? "default" : "outline"}
                    className="rounded-xl"
                    style={showPdfViewer ? { backgroundColor: brandPrimary } : {}}
                    onClick={() => setShowPdfViewer(!showPdfViewer)}
                    title="PDF bekijken"
                  >
                    <Eye className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
              </div>

              {/* Cluster 2: Metadata */}
              <div className="rounded-2xl bg-white p-5 shadow-sm">
                {/* Author */}
                {doc.authors?.[0] && (
                  <div className="flex items-center gap-2">
                    <User className="h-3.5 w-3.5 text-gray-400" aria-hidden="true" />
                    <span className="text-sm text-gray-600">{doc.authors.join(", ")}</span>
                  </div>
                )}

                {/* Compact date + pages + level row */}
                {(doc.publicationDate || doc.pageCount || displayLevel !== "original") && (
                  <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-500${doc.authors?.[0] ? " mt-2" : ""}`}>
                    {doc.publicationDate && (
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-gray-400" aria-hidden="true" />
                        <span>{formatShortDate(doc.publicationDate, docLang)}</span>
                      </div>
                    )}
                    {doc.publicationDate && doc.pageCount && (
                      <span className="text-gray-300">·</span>
                    )}
                    {doc.pageCount && (
                      <div className="flex items-center gap-1.5">
                        <FileText className="h-3.5 w-3.5 text-gray-400" aria-hidden="true" />
                        <span>{doc.pageCount} pag.</span>
                      </div>
                    )}
                    {displayLevel !== "original" && (
                      <>
                        {(doc.publicationDate || doc.pageCount) && (
                          <span className="text-gray-300">·</span>
                        )}
                        <span
                          className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-bold text-white"
                          style={{ backgroundColor: brandPrimary }}
                        >
                          {displayLevel}
                        </span>
                      </>
                    )}
                  </div>
                )}

                {/* Version */}
                {doc.version && (
                  <div className="flex items-center gap-2 mt-2">
                    <Hash className="h-3.5 w-3.5 text-gray-400" aria-hidden="true" />
                    <span className="text-sm text-gray-500">{t.version} {doc.version}</span>
                  </div>
                )}

                {/* Tags */}
                {doc.tags?.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
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
            </div>
          </aside>

          {/* Main content */}
          <main className="order-1 space-y-6 lg:order-2">
            {/* PDF Viewer */}
            {showPdfViewer && (
              <Suspense
                fallback={
                  <div className="flex h-[400px] items-center justify-center rounded-xl bg-white shadow-sm">
                    <div
                      className="h-8 w-8 animate-spin rounded-full border-4 border-t-transparent"
                      style={{ borderColor: `${brandPrimary} transparent ${brandPrimary} ${brandPrimary}` }}
                    />
                  </div>
                }
              >
                <PdfViewer shortId={doc.shortId} brandPrimary={brandPrimary} />
              </Suspense>
            )}

            {/* Summary */}
            <section id="samenvatting" className="group rounded-xl bg-white p-6 shadow-sm md:p-8 lg:pr-16 xl:pr-24">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-xl font-bold text-gray-900 md:text-2xl">
                  <FileText className="h-6 w-6 md:h-7 md:w-7" style={{ color: brandPrimary }} aria-hidden="true" />
                  {t.summary}
                </h2>
                <SectionFeedbackButton
                  shortId={doc.shortId}
                  sectionType="summary"
                  sectionTitle={t.summary}
                  sessionId={analytics.sessionId}
                />
              </div>
              <div onClick={handleTermClick}>
                <div
                  className="prose max-w-none text-gray-700"
                  style={{ fontSize: "0.95rem", lineHeight: "1.8" }}
                  dangerouslySetInnerHTML={{ __html: highlightTerms(currentSummary) }}
                />
              </div>
            </section>

            {/* Key Points */}
            {doc.content.keyPoints?.length > 0 && (
              <section id="hoofdpunten" className="group rounded-xl bg-white p-6 shadow-sm md:p-8">
                <div className="mb-6 flex items-center justify-between">
                  <h2 className="flex items-center gap-2 text-xl font-bold text-gray-900 md:text-2xl">
                    <CheckCircle className="h-6 w-6 md:h-7 md:w-7" style={{ color: brandPrimary }} aria-hidden="true" />
                    {t.keyPoints}
                  </h2>
                  <SectionFeedbackButton
                    shortId={doc.shortId}
                    sectionType="keyPoint"
                    sectionTitle={t.keyPoints}
                    sessionId={analytics.sessionId}
                  />
                </div>
                <div className="space-y-3" onClick={handleTermClick}>
                  {doc.content.keyPoints.map((kp, i) => (
                    <div
                      key={i}
                      className={`rounded-2xl border bg-white transition-all ${
                        expandedKeyPoint === i
                          ? "border-gray-200 shadow-md"
                          : "border-gray-100 hover:border-gray-200 hover:shadow-md"
                      }`}
                    >
                      <button
                        type="button"
                        className="flex w-full items-center gap-4 p-5 text-left"
                        onClick={(e) => {
                          if ((e.target as HTMLElement).hasAttribute("data-term")) return;
                          toggleKeyPoint(i);
                        }}
                      >
                        <span
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
                          style={{ backgroundColor: brandPrimary }}
                        >
                          {i + 1}
                        </span>
                        <span
                          className="flex-1 text-base leading-relaxed text-gray-700"
                          dangerouslySetInnerHTML={{ __html: highlightTerms(kp.text) }}
                        />
                        <ChevronDown
                          className={`h-5 w-5 shrink-0 text-gray-400 transition-transform duration-200 ${
                            expandedKeyPoint === i ? "rotate-180" : ""
                          }`}
                          aria-hidden="true"
                        />
                      </button>
                      {expandedKeyPoint === i && (
                        <div className="border-t border-gray-100 px-5 pb-5 pt-4 pl-[4.25rem]">
                          {loadingKeyPoint === i ? (
                            <div className="flex items-center gap-2 text-sm text-gray-400">
                              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                              <span>{t.loadingExplanation}</span>
                            </div>
                          ) : keyPointExplanations[i] ? (
                            <div className="prose prose-sm max-w-none text-gray-600 [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_p]:my-1.5 [&_ul]:my-1.5 [&_ol]:my-1.5 [&_li]:my-0">
                              <ReactMarkdown>{keyPointExplanations[i]}</ReactMarkdown>
                            </div>
                          ) : null}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Findings */}
            {doc.content.findings?.length > 0 && (
              <section id="bevindingen" className="group rounded-xl bg-white p-6 shadow-sm md:p-8">
                <div className="mb-6 flex items-center justify-between">
                  <h2 className="flex items-center gap-2 text-xl font-bold text-gray-900 md:text-2xl">
                    <BarChart3 className="h-6 w-6 md:h-7 md:w-7" style={{ color: brandPrimary }} aria-hidden="true" />
                    {t.findings}
                  </h2>
                  <SectionFeedbackButton
                    shortId={doc.shortId}
                    sectionType="finding"
                    sectionTitle={t.findings}
                    sessionId={analytics.sessionId}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {doc.content.findings.map((f, i) => (
                    <button
                      type="button"
                      key={i}
                      className={`rounded-2xl border bg-white transition-all cursor-pointer text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0062EB] ${
                        expandedFinding === i
                          ? "border-gray-200 shadow-md sm:col-span-2"
                          : "border-gray-100 hover:border-gray-200 hover:shadow-md"
                      }`}
                      onClick={() => toggleFinding(i)}
                      aria-expanded={expandedFinding === i}
                    >
                      <div className="p-6">
                        <div className="flex items-start justify-between gap-2">
                          <span
                            className="mb-3 inline-block rounded-full px-3 py-1 text-xs font-medium"
                            style={{ backgroundColor: primaryLight, color: brandPrimary }}
                          >
                            {f.category}
                          </span>
                          <ChevronDown
                            className={`h-5 w-5 shrink-0 text-gray-400 transition-transform duration-200 ${
                              expandedFinding === i ? "rotate-180" : ""
                            }`}
                            aria-hidden="true"
                          />
                        </div>
                        <h3 className="mb-2 text-base font-semibold text-gray-900 leading-snug">
                          {f.title}
                        </h3>
                        <p className="text-sm leading-relaxed text-gray-500">
                          {f.content}
                        </p>
                      </div>
                      {expandedFinding === i && (
                        <div className="border-t border-gray-100 px-6 pb-6 pt-4">
                          {loadingFinding === i ? (
                            <div className="flex items-center gap-2 text-sm text-gray-400">
                              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                              <span>{t.loadingContext}</span>
                            </div>
                          ) : findingExplanations[i] ? (
                            <div className="prose prose-sm max-w-none text-gray-600 [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_p]:my-1.5 [&_ul]:my-1.5 [&_ol]:my-1.5 [&_li]:my-0">
                              <ReactMarkdown>{findingExplanations[i]}</ReactMarkdown>
                            </div>
                          ) : null}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* Info box — document-level overrides template-level */}
            {(doc.infoBoxLabel || template.showInfoBox) && (
              <TemplateInfoBox
                brandPrimary={brandPrimary}
                primaryLight={primaryLight}
                label={doc.infoBoxLabel || template.infoBoxLabel}
                text={doc.infoBoxText}
                lang={docLang}
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
        language={doc.language || "nl"}
      />
    </div>
  );
}

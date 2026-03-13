"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FileText,
  CheckCircle,
  BookOpen,
  ExternalLink,
} from "lucide-react";
import ReactMarkdown from "react-markdown";

interface EmbedDocument {
  _id: string;
  shortId: string;
  title: string;
  displayTitle?: string;
  content: {
    summary: { original: string; B1: string; B2: string; C1: string };
    keyPoints: { text: string; explanation?: string; linkedTerms: string[] }[];
    terms: { term: string; definition: string; occurrences: number }[];
  };
  language?: "nl" | "en";
  languageLevel?: "B1" | "B2" | "C1" | "C2";
  targetCEFRLevel?: "B1" | "B2" | "C1" | "C2";
  brandOverride?: { primary?: string };
  template?: string;
  templateConfig?: { primary: string; primaryLight: string };
}

export default function EmbedReaderPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const [doc, setDoc] = useState<EmbedDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const theme = searchParams.get("theme") || "light";
  const compact = searchParams.get("compact") === "true";

  useEffect(() => {
    async function fetchDocument() {
      try {
        const res = await fetch(`/api/reader/${params.shortId}`, {
          cache: "no-store",
        });

        if (!res.ok) {
          setError("Document niet gevonden of nog niet gepubliceerd.");
          setLoading(false);
          return;
        }

        const { data } = await res.json();
        setDoc(data);
      } catch {
        setError("Kon document niet laden.");
      } finally {
        setLoading(false);
      }
    }

    fetchDocument();
  }, [params.shortId]);

  const isDark = theme === "dark";
  const bgColor = isDark ? "#1a1a2e" : "#ffffff";
  const textColor = isDark ? "#e0e0e0" : "#374151";
  const headingColor = isDark ? "#f5f5f5" : "#111827";
  const mutedColor = isDark ? "#9ca3af" : "#6b7280";
  const cardBg = isDark ? "#16213e" : "#f9fafb";
  const borderColor = isDark ? "#2d3748" : "#e5e7eb";

  if (loading) {
    return (
      <div
        className="p-4 md:p-6"
        style={{ backgroundColor: bgColor, minHeight: "100vh" }}
      >
        <Skeleton className="mb-3 h-6 w-3/4" />
        <Skeleton className="mb-2 h-4 w-full" />
        <Skeleton className="mb-2 h-4 w-full" />
        <Skeleton className="mb-2 h-4 w-5/6" />
        <Skeleton className="mt-6 mb-3 h-6 w-1/2" />
        <Skeleton className="mb-2 h-10 w-full" />
        <Skeleton className="mb-2 h-10 w-full" />
        <Skeleton className="mb-2 h-10 w-full" />
      </div>
    );
  }

  if (error || !doc) {
    return (
      <div
        className="flex min-h-screen items-center justify-center p-6"
        style={{ backgroundColor: bgColor }}
      >
        <div className="text-center">
          <FileText
            className="mx-auto mb-3 h-10 w-10"
            style={{ color: mutedColor }}
          />
          <p style={{ color: textColor }} className="text-sm font-medium">
            {error || "Document niet gevonden."}
          </p>
        </div>
      </div>
    );
  }

  const brandPrimary =
    doc.brandOverride?.primary ||
    doc.templateConfig?.primary ||
    "#0062EB";

  const displayLevel = doc.targetCEFRLevel || doc.languageLevel || "original";
  const summaryKey =
    displayLevel !== "original" && displayLevel !== "C2" ? displayLevel : null;
  const currentSummary = summaryKey
    ? doc.content.summary[summaryKey] || doc.content.summary.original
    : doc.content.summary.original;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://doc1.ai";
  const docUrl = `${siteUrl}/${doc.shortId}`;

  return (
    <div
      className="embed-reader"
      style={{
        backgroundColor: bgColor,
        color: textColor,
        minHeight: "100vh",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <div className="p-4 md:p-6 space-y-5">
        {/* Summary */}
        <section>
          <h2
            className="mb-3 flex items-center gap-2 text-lg font-bold"
            style={{ color: headingColor }}
          >
            <FileText
              className="h-5 w-5 shrink-0"
              style={{ color: brandPrimary }}
            />
            Samenvatting
          </h2>
          <div
            className="prose prose-sm max-w-none leading-relaxed"
            style={{ color: textColor, fontSize: "0.9rem", lineHeight: "1.75" }}
          >
            <ReactMarkdown>{currentSummary}</ReactMarkdown>
          </div>
        </section>

        {/* Key Points - hidden in compact mode */}
        {!compact && doc.content.keyPoints?.length > 0 && (
          <section>
            <h2
              className="mb-3 flex items-center gap-2 text-lg font-bold"
              style={{ color: headingColor }}
            >
              <CheckCircle
                className="h-5 w-5 shrink-0"
                style={{ color: brandPrimary }}
              />
              Hoofdpunten
            </h2>
            <div className="space-y-2">
              {doc.content.keyPoints.map((kp, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 rounded-lg p-3"
                  style={{
                    backgroundColor: cardBg,
                    border: `1px solid ${borderColor}`,
                  }}
                >
                  <span
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
                    style={{ backgroundColor: brandPrimary }}
                  >
                    {i + 1}
                  </span>
                  <span
                    className="text-sm leading-relaxed"
                    style={{ color: textColor }}
                  >
                    {kp.text}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Terms - hidden in compact mode */}
        {!compact && doc.content.terms?.length > 0 && (
          <section>
            <h2
              className="mb-3 flex items-center gap-2 text-lg font-bold"
              style={{ color: headingColor }}
            >
              <BookOpen
                className="h-5 w-5 shrink-0"
                style={{ color: brandPrimary }}
              />
              Begrippen
            </h2>
            <div className="space-y-2">
              {doc.content.terms.map((term, i) => (
                <div
                  key={i}
                  className="rounded-lg p-3"
                  style={{
                    backgroundColor: cardBg,
                    border: `1px solid ${borderColor}`,
                  }}
                >
                  <span
                    className="text-sm font-semibold"
                    style={{ color: brandPrimary }}
                  >
                    {term.term}
                  </span>
                  <p
                    className="mt-1 text-xs leading-relaxed"
                    style={{ color: mutedColor }}
                  >
                    {term.definition}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Footer link */}
        <div
          className="pt-3 text-center"
          style={{ borderTop: `1px solid ${borderColor}` }}
        >
          <a
            href={docUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-medium no-underline transition-opacity hover:opacity-80"
            style={{ color: brandPrimary }}
          >
            Bekijk op doc1.ai
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
    </div>
  );
}

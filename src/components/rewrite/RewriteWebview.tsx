"use client";

import { useState, useMemo } from "react";
import B1ScoreBadge from "./B1ScoreBadge";
import DiffToggle, { DiffHighlight } from "./DiffToggle";
import VersionSelector from "./VersionSelector";
import StatusBadge from "../shared/StatusBadge";
import type { RewriteVersion, ContentDiff, DocumentRewriteStatus } from "@/types/rewrite";

interface RewriteWebviewProps {
  title: string;
  organizationName?: string;
  organizationLogo?: string;
  versions: RewriteVersion[];
  activeVersionNumber: number;
  status: DocumentRewriteStatus;
  onVersionChange?: (versionNumber: number) => void;
  onFeedbackClick?: (sectionId: string) => void;
}

export default function RewriteWebview({
  title,
  organizationName,
  organizationLogo,
  versions,
  activeVersionNumber,
  status,
  onVersionChange,
  onFeedbackClick,
}: RewriteWebviewProps) {
  const [showChanges, setShowChanges] = useState(false);
  const [showSplitView, setShowSplitView] = useState(false);

  const activeVersion = useMemo(
    () => versions.find((v) => v.versionNumber === activeVersionNumber),
    [versions, activeVersionNumber]
  );

  if (!activeVersion) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Geen versie beschikbaar.
      </div>
    );
  }

  // Parse content into sections for the table of contents
  const sections = useMemo(() => {
    const lines = activeVersion.content.split("\n");
    return lines
      .filter((line) => line.match(/^#{1,4}\s+/))
      .map((line) => {
        const match = line.match(/^(#{1,4})\s+(.+)$/);
        if (!match) return null;
        return {
          level: match[1].length,
          title: match[2],
          id: match[2].toLowerCase().replace(/\s+/g, "-"),
        };
      })
      .filter(Boolean) as Array<{ level: number; title: string; id: string }>;
  }, [activeVersion.content]);

  return (
    <div className="border rounded-lg overflow-hidden bg-white">
      {/* Header */}
      <div className="border-b p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {organizationLogo && (
              <img
                src={organizationLogo}
                alt={organizationName || ""}
                className="h-8 w-auto"
              />
            )}
            <div>
              <h1 className="text-lg font-semibold">{title}</h1>
              {organizationName && (
                <span className="text-sm text-muted-foreground">
                  {organizationName}
                </span>
              )}
            </div>
          </div>
          <StatusBadge status={status} />
        </div>

        {/* Score & controls */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <B1ScoreBadge score={activeVersion.b1Score} />
            <VersionSelector
              versions={versions}
              activeVersion={activeVersionNumber}
              onVersionChange={(v) => onVersionChange?.(v)}
            />
          </div>
          <DiffToggle
            showChanges={showChanges}
            onToggle={setShowChanges}
            showSplitView={showSplitView}
            onSplitViewToggle={setShowSplitView}
          />
        </div>
      </div>

      {/* Content area */}
      <div className="flex">
        {/* Sidebar: Table of contents */}
        <div className="w-56 shrink-0 border-r p-4 sticky top-0 self-start max-h-screen overflow-y-auto hidden lg:block">
          <h3 className="text-xs font-semibold uppercase text-muted-foreground mb-3">
            Inhoudsopgave
          </h3>
          <nav className="space-y-1">
            {sections.map((section, idx) => (
              <a
                key={idx}
                href={`#${section.id}`}
                className={`block text-sm py-1 hover:text-primary transition-colors ${
                  section.level === 1
                    ? "font-medium"
                    : section.level === 2
                      ? "pl-3"
                      : section.level === 3
                        ? "pl-6 text-muted-foreground"
                        : "pl-9 text-muted-foreground text-xs"
                }`}
              >
                {section.title}
              </a>
            ))}
          </nav>
        </div>

        {/* Main content */}
        <div className="flex-1 p-6 min-w-0">
          {showSplitView ? (
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-4">
                  Origineel
                </h3>
                <div
                  className="prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{
                    __html: formatContent(activeVersion.originalContent),
                  }}
                />
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-4">
                  Herschreven
                </h3>
                <div
                  className="prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{
                    __html: formatContent(activeVersion.content),
                  }}
                />
              </div>
            </div>
          ) : showChanges && activeVersion.diffs.length > 0 ? (
            <DiffHighlight
              content={activeVersion.content}
              diffs={activeVersion.diffs}
              showChanges={showChanges}
            />
          ) : (
            <div
              className="prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{
                __html: formatContent(activeVersion.content),
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function formatContent(text: string): string {
  return text
    .split("\n")
    .map((line) => {
      const headingMatch = line.match(/^(#{1,4})\s+(.+)$/);
      if (headingMatch) {
        const level = headingMatch[1].length;
        const id = headingMatch[2].toLowerCase().replace(/\s+/g, "-");
        const sizes = ["text-2xl", "text-xl", "text-lg", "text-base"];
        return `<h${level} id="${id}" class="font-bold ${sizes[level - 1]} mt-6 mb-3">${headingMatch[2]}</h${level}>`;
      }
      if (line.match(/^[-*]\s+/)) {
        return `<li class="ml-4 mb-1">${line.replace(/^[-*]\s+/, "")}</li>`;
      }
      if (line.match(/^\d+\.\s+/)) {
        return `<li class="ml-4 mb-1 list-decimal">${line.replace(/^\d+\.\s+/, "")}</li>`;
      }
      if (line.trim() === "") return "<br />";
      return `<p class="mb-2 leading-relaxed">${line}</p>`;
    })
    .join("");
}

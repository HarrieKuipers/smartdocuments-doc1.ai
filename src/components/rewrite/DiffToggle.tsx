"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, Columns2 } from "lucide-react";
import type { ContentDiff } from "@/types/rewrite";

interface DiffToggleProps {
  showChanges: boolean;
  onToggle: (show: boolean) => void;
  showSplitView?: boolean;
  onSplitViewToggle?: (show: boolean) => void;
}

export default function DiffToggle({
  showChanges,
  onToggle,
  showSplitView,
  onSplitViewToggle,
}: DiffToggleProps) {
  return (
    <div className="flex items-center gap-2">
      <Button
        variant={showChanges ? "default" : "outline"}
        size="sm"
        onClick={() => onToggle(!showChanges)}
      >
        {showChanges ? (
          <Eye className="size-4 mr-1.5" />
        ) : (
          <EyeOff className="size-4 mr-1.5" />
        )}
        {showChanges ? "Wijzigingen verbergen" : "Toon wijzigingen"}
      </Button>

      {onSplitViewToggle && (
        <Button
          variant={showSplitView ? "default" : "outline"}
          size="sm"
          onClick={() => onSplitViewToggle?.(!showSplitView)}
        >
          <Columns2 className="size-4 mr-1.5" />
          Vergelijk origineel
        </Button>
      )}
    </div>
  );
}

interface DiffHighlightProps {
  content: string;
  diffs: ContentDiff[];
  showChanges: boolean;
}

export function DiffHighlight({
  content,
  diffs,
  showChanges,
}: DiffHighlightProps) {
  if (!showChanges) {
    return <div dangerouslySetInnerHTML={{ __html: formatContent(content) }} />;
  }

  // Show content with highlighted changes
  return (
    <div className="space-y-4">
      {diffs.map((diff) => (
        <div key={diff.sectionId} className="relative">
          <div className="bg-yellow-50 border-l-4 border-yellow-300 p-3 rounded-r-md">
            <h4 className="text-sm font-medium text-yellow-800 mb-2">
              {diff.sectionTitle} ({diff.changesCount} wijzigingen)
            </h4>
            <div
              className="text-sm"
              dangerouslySetInnerHTML={{
                __html: formatContent(diff.rewritten),
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function formatContent(text: string): string {
  return text
    .split("\n")
    .map((line) => {
      // Convert markdown headings to HTML
      const headingMatch = line.match(/^(#{1,4})\s+(.+)$/);
      if (headingMatch) {
        const level = headingMatch[1].length;
        return `<h${level} class="font-bold ${level === 1 ? "text-xl" : level === 2 ? "text-lg" : "text-base"} mt-4 mb-2">${headingMatch[2]}</h${level}>`;
      }
      // Convert list items
      if (line.match(/^[-*]\s+/)) {
        return `<li class="ml-4">${line.replace(/^[-*]\s+/, "")}</li>`;
      }
      if (line.match(/^\d+\.\s+/)) {
        return `<li class="ml-4 list-decimal">${line.replace(/^\d+\.\s+/, "")}</li>`;
      }
      if (line.trim() === "") {
        return "<br />";
      }
      return `<p class="mb-2">${line}</p>`;
    })
    .join("");
}

/**
 * Diff engine for comparing original and rewritten text.
 * Uses simple paragraph-level comparison for clean display.
 */

import type { ContentDiff } from "@/types/rewrite";
import type { DocumentSection } from "./chunker";

/**
 * Calculate diffs between original sections and rewritten sections.
 */
export function calculateDiffs(
  originalSections: DocumentSection[],
  rewrittenSections: Map<string, string>
): ContentDiff[] {
  const diffs: ContentDiff[] = [];

  for (const section of originalSections) {
    const rewritten = rewrittenSections.get(section.id);
    if (!rewritten) continue;

    const original = section.content;
    const changesCount = countChanges(original, rewritten);

    if (changesCount > 0) {
      diffs.push({
        sectionId: section.id,
        sectionTitle: section.title,
        original,
        rewritten,
        changesCount,
      });
    }
  }

  return diffs;
}

/**
 * Count the number of changed sentences between original and rewritten text.
 */
function countChanges(original: string, rewritten: string): number {
  const originalSentences = splitSentences(original);
  const rewrittenSentences = splitSentences(rewritten);

  let changes = 0;
  const maxLen = Math.max(originalSentences.length, rewrittenSentences.length);

  for (let i = 0; i < maxLen; i++) {
    const orig = normalizeForComparison(originalSentences[i] || "");
    const rewr = normalizeForComparison(rewrittenSentences[i] || "");
    if (orig !== rewr) {
      changes++;
    }
  }

  return changes;
}

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function normalizeForComparison(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * Reassemble the full rewritten document from sections.
 */
export function reassembleDocument(
  originalSections: DocumentSection[],
  rewrittenSections: Map<string, string>
): string {
  const parts: string[] = [];

  for (const section of originalSections) {
    // Add heading
    const headingPrefix = "#".repeat(section.level);
    parts.push(`${headingPrefix} ${section.title}`);

    // Add rewritten or original content
    const content = rewrittenSections.get(section.id) || section.content;
    parts.push(content);
    parts.push(""); // blank line between sections
  }

  return parts.join("\n");
}

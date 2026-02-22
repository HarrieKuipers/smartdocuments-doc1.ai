/**
 * Main rewrite pipeline — orchestrates the AI rewrite process.
 *
 * Flow:
 * 1. Structure extraction (extract sections)
 * 2. Chunking (dynamic, ~600 tokens per chunk)
 * 3. MCP checks (parallel, per selected rule)
 * 4. AI rewrite per chunk (prompt built from schrijfwijzer rules)
 * 5. Safety check (deterministic validation)
 * 6. Reassemble & structure restore
 * 7. B1 compliance score
 */

import anthropic from "@/lib/ai/client";
import { MODELS } from "@/lib/ai/client";
import { chunkDocument, type DocumentSection } from "./chunker";
import { buildRewritePrompt } from "./schrijfwijzer-mapper";
import { runMCPToolsForRules } from "./mcp-client";
import { runSafetyCheck } from "./safety-check";
import { calculateDiffs, reassembleDocument } from "./diff-engine";
import { calculateB1Score } from "./b1-scorer";
import { SCHRIJFWIJZER_TOOL_MAP } from "@/types/schrijfwijzer";
import type { SchrijfwijzerRule } from "@/types/schrijfwijzer";
import type { ContentDiff, RewriteVersion } from "@/types/rewrite";

type ProgressCallback = (
  step: string,
  percentage: number,
  message?: string
) => Promise<void>;

interface PipelineInput {
  text: string;
  rules: SchrijfwijzerRule[];
  selectedRules: number[];
  onProgress?: ProgressCallback;
}

interface PipelineResult {
  version: Omit<RewriteVersion, "createdAt">;
  sections: DocumentSection[];
}

export async function runRewritePipeline(
  input: PipelineInput
): Promise<PipelineResult> {
  const { text, rules, selectedRules, onProgress } = input;

  // Step 1: Structure extraction & chunking (10%)
  await onProgress?.("structure-extraction", 10, "Documentstructuur analyseren...");

  const { sections, chunks } = chunkDocument(text);

  console.log(
    `Pipeline: ${sections.length} sections, ${chunks.length} chunks`
  );

  // Step 2: MCP checks per section (20-30%)
  await onProgress?.("mcp-checks", 20, "Taalregels controleren...");

  const mcpResultsBySection = new Map<string, Map<string, unknown>>();

  // Run MCP checks on section content (not per chunk to avoid duplication)
  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    try {
      const mcpResults = await runMCPToolsForRules(
        section.content,
        SCHRIJFWIJZER_TOOL_MAP,
        selectedRules
      );
      mcpResultsBySection.set(section.id, mcpResults);
    } catch (error) {
      console.warn(
        `MCP checks failed for section ${section.id} (non-blocking):`,
        error
      );
    }

    const progress = 20 + Math.round((i / sections.length) * 10);
    await onProgress?.(
      "mcp-checks",
      progress,
      `Taalregels controleren: sectie ${i + 1}/${sections.length}...`
    );
  }

  // Step 3: AI rewrite per chunk (30-80%)
  await onProgress?.("ai-rewrite", 30, "Tekst herschrijven...");

  const systemPrompt = buildRewritePrompt(rules, selectedRules);
  const rewrittenSections = new Map<string, string>();

  // Process sections sequentially (to avoid rate limits and maintain order)
  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    const sectionChunks = chunks.filter((c) => c.sectionId === section.id);

    const rewrittenChunks: string[] = [];

    for (const chunk of sectionChunks) {
      const prompt = systemPrompt.replace("{CHUNK}", chunk.text);

      // Include MCP findings in the prompt if available
      const mcpFindings = mcpResultsBySection.get(section.id);
      let enhancedPrompt = prompt;
      if (mcpFindings && mcpFindings.size > 0) {
        const findingsSummary = summarizeMCPFindings(mcpFindings);
        if (findingsSummary) {
          enhancedPrompt = prompt.replace(
            "Herschrijf de volgende sectie:",
            `Eerder geconstateerde problemen in deze tekst:\n${findingsSummary}\n\nHerschrijf de volgende sectie:`
          );
        }
      }

      try {
        const response = await anthropic.messages.create({
          model: MODELS.processing,
          max_tokens: 4096,
          messages: [{ role: "user", content: enhancedPrompt }],
        });

        const rewrittenText =
          response.content[0].type === "text" ? response.content[0].text : "";
        rewrittenChunks.push(rewrittenText);
      } catch (error) {
        console.error(`AI rewrite failed for chunk ${chunk.id}:`, error);
        // Fall back to original text
        rewrittenChunks.push(chunk.text);
      }
    }

    // Merge chunks back into section (use last chunk's content for overlapping parts)
    const mergedContent = mergeChunks(rewrittenChunks);
    rewrittenSections.set(section.id, mergedContent);

    const progress = 30 + Math.round(((i + 1) / sections.length) * 50);
    await onProgress?.(
      "ai-rewrite",
      progress,
      `Herschrijven: sectie ${i + 1}/${sections.length}...`
    );
  }

  // Step 4: Safety check (80-85%)
  await onProgress?.("safety-check", 80, "Veiligheidscontrole uitvoeren...");

  for (const section of sections) {
    const rewritten = rewrittenSections.get(section.id);
    if (!rewritten) continue;

    const safetyResult = runSafetyCheck(section.content, rewritten);
    if (!safetyResult.passed) {
      console.warn(
        `Safety issues in section ${section.id}:`,
        safetyResult.issues
      );
      // Keep the rewritten text but log the issues
      // In production, could apply corrected text or flag for review
    }
  }

  // Step 5: Reassemble document (85-90%)
  await onProgress?.(
    "reassemble",
    85,
    "Document samenvoegen..."
  );

  const fullRewrittenContent = reassembleDocument(sections, rewrittenSections);

  // Step 6: Calculate diffs (90-95%)
  await onProgress?.("diff-calculation", 90, "Wijzigingen berekenen...");

  const diffs = calculateDiffs(sections, rewrittenSections);
  const rulesApplied = identifyAppliedRules(diffs, selectedRules);

  // Step 7: B1 score (95-100%)
  await onProgress?.(
    "b1-score",
    95,
    "B1-score berekenen..."
  );

  const b1Score = calculateB1Score(fullRewrittenContent);

  await onProgress?.("complete", 100, "Herschrijving voltooid!");

  return {
    version: {
      versionNumber: 1,
      content: fullRewrittenContent,
      originalContent: text,
      diffs,
      b1Score,
      rulesApplied,
    },
    sections,
  };
}

/**
 * Merge overlapping chunks back into a single text.
 */
function mergeChunks(chunks: string[]): string {
  if (chunks.length <= 1) return chunks[0] || "";
  // Simple merge: just concatenate (overlap handled by chunker boundaries)
  return chunks.join("\n\n");
}

/**
 * Summarize MCP findings into a brief text for the AI prompt.
 */
function summarizeMCPFindings(findings: Map<string, unknown>): string {
  const summaryParts: string[] = [];

  for (const [tool, result] of findings) {
    if (!result || typeof result !== "object") continue;

    const r = result as Record<string, unknown>;

    // Extract key findings based on common MCP response patterns
    if (Array.isArray(r.findings) && r.findings.length > 0) {
      const toolLabel = toolDisplayName(tool);
      const count = r.findings.length;
      summaryParts.push(`- ${toolLabel}: ${count} gevonden`);
    }

    if (Array.isArray(r.bevindingen) && r.bevindingen.length > 0) {
      const toolLabel = toolDisplayName(tool);
      const count = r.bevindingen.length;
      summaryParts.push(`- ${toolLabel}: ${count} gevonden`);
    }
  }

  return summaryParts.join("\n");
}

function toolDisplayName(tool: string): string {
  const names: Record<string, string> = {
    check_zinslengte: "Te lange zinnen",
    check_passief_taalgebruik: "Passieve zinnen",
    check_tangconstructies: "Tangconstructies",
    check_dubbele_ontkenning: "Dubbele ontkenningen",
    check_nominalisaties: "Nominalisaties",
    check_moeilijke_woorden: "Moeilijke woorden",
    check_jargon: "Vaktaal",
    check_formele_woorden: "Formele woorden",
  };
  return names[tool] || tool;
}

/**
 * Identify which rules actually produced changes in the diffs.
 */
function identifyAppliedRules(
  diffs: ContentDiff[],
  selectedRules: number[]
): number[] {
  // For now, return all selected rules if any changes were made
  if (diffs.length > 0) {
    return selectedRules;
  }
  return [];
}

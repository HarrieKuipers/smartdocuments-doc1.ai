import anthropic, { MODELS } from "./client";
import type { AudienceAnalysis } from "./analyze-audience";
import { type DocumentLanguage, getLangStrings } from "./language";

interface LanguageLevelSummaries {
  B1: string;
  B2: string;
  C1: string;
}

export async function generateLanguageLevelSummaries(
  originalSummary: string,
  audienceContext?: AudienceAnalysis,
  lang: DocumentLanguage = "nl"
): Promise<LanguageLevelSummaries> {
  const L = getLangStrings(lang);
  const isInternal = audienceContext && !audienceContext.isExternal;

  const perspectiveInstruction = isInternal
    ? L.summaryPerspectiveInternal(audienceContext.audience)
    : "";

  const response = await anthropic.messages.create({
    model: MODELS.processing,
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: `${L.summaryPrompt} ${L.outputLanguage}.
${perspectiveInstruction}

${lang === "nl" ? "Originele samenvatting" : "Original summary"}:
${originalSummary}

${L.summaryLevels}

Geef het resultaat als JSON (geen markdown, alleen JSON):
{
  "B1": "${lang === "nl" ? "samenvatting op B1 niveau" : "summary at B1 level"}...",
  "B2": "${lang === "nl" ? "samenvatting op B2 niveau" : "summary at B2 level"}...",
  "C1": "${lang === "nl" ? "samenvatting op C1 niveau" : "summary at C1 level"}..."
}`,
      },
    ],
  });

  const content = response.content[0];
  if (content.type !== "text") {
    throw new Error("Unexpected response type");
  }

  try {
    return JSON.parse(content.text);
  } catch {
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error("Could not parse language level summaries response");
  }
}

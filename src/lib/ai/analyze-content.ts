import anthropic, { MODELS } from "./client";
import type { AudienceAnalysis } from "./analyze-audience";
import { type DocumentLanguage, getLangStrings } from "./language";

interface ContentAnalysis {
  summary: string;
  keyPoints: { text: string; explanation: string; linkedTerms: string[] }[];
  findings: { category: string; title: string; content: string }[];
  languageLevel?: "B1" | "B2" | "C1" | "C2";
}

export async function analyzeContent(
  text: string,
  audienceContext?: AudienceAnalysis,
  lang: DocumentLanguage = "nl"
): Promise<ContentAnalysis> {
  // Chunk text if too long (max ~80k chars for context)
  const textToAnalyze = text.slice(0, 80000);
  const L = getLangStrings(lang);

  const isInternal = audienceContext && !audienceContext.isExternal;

  const perspectiveInstruction = isInternal
    ? L.perspectiveInternal(audienceContext.documentType, audienceContext.audience)
    : "";

  const response = await anthropic.messages.create({
    model: MODELS.processing,
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: `${L.analyzePrompt}
${perspectiveInstruction}
${L.findingsInstruction}

${L.outputLanguageFull}

Tekst:
${textToAnalyze}

Geef het resultaat als JSON (geen markdown, alleen JSON):
${L.jsonExample}`,
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
    throw new Error("Could not parse content analysis response");
  }
}

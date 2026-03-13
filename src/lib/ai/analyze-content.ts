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
  lang: DocumentLanguage = "nl",
  targetLevel?: "B1" | "B2" | "C1" | "C2"
): Promise<ContentAnalysis> {
  // Chunk text if too long (max ~80k chars for context)
  const textToAnalyze = text.slice(0, 80000);
  const L = getLangStrings(lang);

  const isInternal = audienceContext && !audienceContext.isExternal;

  const perspectiveInstruction = isInternal
    ? L.perspectiveInternal(audienceContext.documentType, audienceContext.audience)
    : "";

  const targetLevelInstruction = targetLevel
    ? lang === "nl"
      ? `\nBELANGRIJK: Schrijf ALLE output (samenvatting, hoofdpunten, bevindingen) op CEFR taalniveau ${targetLevel}. ${targetLevel === "B1" ? "Gebruik korte zinnen, dagelijkse woorden, geen vakjargon." : targetLevel === "B2" ? "Gebruik duidelijke zinnen, beperkt vakjargon met uitleg." : targetLevel === "C1" ? "Complexere zinsstructuren en vakjargon zijn toegestaan." : "Academisch niveau met volledige vakjargon."}`
      : `\nIMPORTANT: Write ALL output (summary, key points, findings) at CEFR level ${targetLevel}. ${targetLevel === "B1" ? "Use short sentences, everyday words, no jargon." : targetLevel === "B2" ? "Use clear sentences, limited jargon with explanations." : targetLevel === "C1" ? "More complex sentence structures and jargon are allowed." : "Academic level with full technical jargon."}`
    : "";

  const response = await anthropic.messages.create({
    model: MODELS.processing,
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: `${L.analyzePrompt}
${perspectiveInstruction}${targetLevelInstruction}
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

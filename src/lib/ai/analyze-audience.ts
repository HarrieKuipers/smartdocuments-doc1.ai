import anthropic, { MODELS } from "./client";
import { type DocumentLanguage, getLangStrings } from "./language";

export interface AudienceAnalysis {
  documentType: string;
  audience: string;
  isExternal: boolean;
}

export async function analyzeAudience(
  text: string,
  lang: DocumentLanguage = "nl"
): Promise<AudienceAnalysis> {
  // Use first ~20k chars — enough to determine audience without wasting tokens
  const textSample = text.slice(0, 20000);
  const L = getLangStrings(lang);

  const response = await anthropic.messages.create({
    model: MODELS.processing,
    max_tokens: 512,
    messages: [
      {
        role: "user",
        content: `${L.audiencePrompt}

${lang === "nl" ? "Tekst" : "Text"}:
${textSample}

${lang === "nl" ? "Geef het resultaat als JSON (geen markdown, alleen JSON):" : "Provide the result as JSON (no markdown, only JSON):"}
${L.audienceJsonExample}`,
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
    throw new Error("Could not parse audience analysis response");
  }
}

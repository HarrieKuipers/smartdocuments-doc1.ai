import anthropic, { MODELS } from "./client";
import { type DocumentLanguage, getLangStrings } from "./language";

interface ExtractedTerm {
  term: string;
  definition: string;
  occurrences: number;
}

export async function extractTerms(
  text: string,
  lang: DocumentLanguage = "nl"
): Promise<ExtractedTerm[]> {
  const textToAnalyze = text.slice(0, 80000);
  const L = getLangStrings(lang);

  const response = await anthropic.messages.create({
    model: MODELS.processing,
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: `${L.termsPrompt} ${L.outputLanguage}.

${lang === "nl" ? "Tekst" : "Text"}:
${textToAnalyze}

${lang === "nl"
  ? "Geef de 10-20 belangrijkste termen als JSON array (geen markdown, alleen JSON):"
  : "Provide the 10-20 most important terms as a JSON array (no markdown, only JSON):"}
[
  {"term": "${lang === "nl" ? "begrip" : "term"}", "definition": "${lang === "nl" ? "Uitgebreide definitie van 2-4 zinnen die het begrip uitlegt in de context van het document." : "Comprehensive definition of 2-4 sentences explaining the term in the context of the document."}", "occurrences": 5}
]`,
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
    const jsonMatch = content.text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error("Could not parse terms response");
  }
}

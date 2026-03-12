import anthropic, { MODELS } from "./client";
import { type DocumentLanguage, getLangStrings } from "./language";

interface ExtractedMetadata {
  title: string;
  displayTitle: string;
  authors: string[];
  publicationDate: string | null;
  version: string | null;
  tags: string[];
  description: string;
}

export async function extractMetadata(
  text: string,
  lang: DocumentLanguage = "nl"
): Promise<ExtractedMetadata> {
  // Use first ~4000 chars for metadata extraction
  const excerpt = text.slice(0, 4000);
  const L = getLangStrings(lang);

  const response = await anthropic.messages.create({
    model: MODELS.processing,
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `${L.metadataPrompt} ${lang === "nl" ? "Geef het resultaat als JSON." : "Provide the result as JSON."}

${lang === "nl" ? "Tekst" : "Text"}:
${excerpt}

${lang === "nl" ? "Geef een JSON object met exact deze structuur (geen markdown, alleen JSON):" : "Provide a JSON object with exactly this structure (no markdown, only JSON):"}
{
  "title": "${lang === "nl" ? "de titel van het document" : "the title of the document"}",
  "displayTitle": "${L.metadataDisplayTitle}",
  "authors": ["${lang === "nl" ? "auteur1" : "author1"}", "${lang === "nl" ? "auteur2" : "author2"}"],
  "publicationDate": "YYYY-MM-DD ${lang === "nl" ? "of" : "or"} null",
  "version": "${lang === "nl" ? "versienummer of" : "version number or"} null",
  "tags": ["tag1", "tag2", "tag3"],
  "description": "${lang === "nl" ? "korte beschrijving van het document in 1-2 zinnen" : "short description of the document in 1-2 sentences"}"
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
    // Try to extract JSON from the response
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error("Could not parse metadata response");
  }
}

import anthropic, { MODELS } from "./client";

interface ExtractedMetadata {
  title: string;
  authors: string[];
  publicationDate: string | null;
  version: string | null;
  tags: string[];
  description: string;
}

export async function extractMetadata(
  text: string
): Promise<ExtractedMetadata> {
  // Use first ~4000 chars for metadata extraction
  const excerpt = text.slice(0, 4000);

  const response = await anthropic.messages.create({
    model: MODELS.processing,
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `Analyseer de volgende tekst en extraheer metadata. Geef het resultaat als JSON.

Tekst:
${excerpt}

Geef een JSON object met exact deze structuur (geen markdown, alleen JSON):
{
  "title": "de titel van het document",
  "authors": ["auteur1", "auteur2"],
  "publicationDate": "YYYY-MM-DD of null",
  "version": "versienummer of null",
  "tags": ["tag1", "tag2", "tag3"],
  "description": "korte beschrijving van het document in 1-2 zinnen"
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

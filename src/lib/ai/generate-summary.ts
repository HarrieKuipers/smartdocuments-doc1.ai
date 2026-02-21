import anthropic, { MODELS } from "./client";

interface LanguageLevelSummaries {
  B1: string;
  B2: string;
  C1: string;
}

export async function generateLanguageLevelSummaries(
  originalSummary: string
): Promise<LanguageLevelSummaries> {
  const response = await anthropic.messages.create({
    model: MODELS.processing,
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: `Herschrijf de volgende samenvatting op drie verschillende taalniveaus. Alle output in het Nederlands.

Originele samenvatting:
${originalSummary}

Taalniveaus:
- B1: Eenvoudig Nederlands. Korte zinnen, dagelijkse woorden, geen vakjargon. Geschikt voor mensen met basiskennis van het Nederlands.
- B2: Gemiddeld niveau. Duidelijke zinnen, beperkt vakjargon met uitleg, geschikt voor het algemene publiek.
- C1: Geavanceerd/academisch niveau. Complexere zinsstructuren, vakjargon toegestaan, geschikt voor professionals.

Geef het resultaat als JSON (geen markdown, alleen JSON):
{
  "B1": "samenvatting op B1 niveau...",
  "B2": "samenvatting op B2 niveau...",
  "C1": "samenvatting op C1 niveau..."
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

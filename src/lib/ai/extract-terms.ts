import anthropic, { MODELS } from "./client";

interface ExtractedTerm {
  term: string;
  definition: string;
  occurrences: number;
}

export async function extractTerms(text: string): Promise<ExtractedTerm[]> {
  const textToAnalyze = text.slice(0, 80000);

  const response = await anthropic.messages.create({
    model: MODELS.processing,
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: `Identificeer de belangrijkste vakbegrippen en termen in de volgende tekst. Geef voor elk begrip een uitgebreide, duidelijke definitie van 2-4 zinnen die het begrip volledig uitlegt in de context van dit document. De definitie moet begrijpelijk zijn voor iemand zonder vakkennis en moet uitleggen waarom het begrip relevant is in dit document. Tel ook hoe vaak de term voorkomt. Alle output in het Nederlands.

Tekst:
${textToAnalyze}

Geef de 10-20 belangrijkste termen als JSON array (geen markdown, alleen JSON):
[
  {"term": "begrip", "definition": "Uitgebreide definitie van 2-4 zinnen die het begrip uitlegt in de context van het document.", "occurrences": 5}
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

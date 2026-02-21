import anthropic, { MODELS } from "./client";

interface ContentAnalysis {
  summary: string;
  keyPoints: { text: string; linkedTerms: string[] }[];
  findings: { category: string; title: string; content: string }[];
}

export async function analyzeContent(text: string): Promise<ContentAnalysis> {
  // Chunk text if too long (max ~80k chars for context)
  const textToAnalyze = text.slice(0, 80000);

  const response = await anthropic.messages.create({
    model: MODELS.processing,
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: `Je bent een expert document-analist. Analyseer de volgende tekst en genereer:
1. Een uitgebreide samenvatting (managementniveau)
2. De belangrijkste hoofdpunten (5-10 punten)
3. Belangrijke bevindingen gecategoriseerd (bijv. Financieel, Strategie, Risico's, Impact, Vooruitzicht)

Alle output in het Nederlands.

Tekst:
${textToAnalyze}

Geef het resultaat als JSON (geen markdown, alleen JSON):
{
  "summary": "uitgebreide samenvatting van het document...",
  "keyPoints": [
    {"text": "hoofdpunt tekst", "linkedTerms": ["term1", "term2"]}
  ],
  "findings": [
    {"category": "Financieel", "title": "korte titel", "content": "beschrijving van de bevinding"}
  ]
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
    throw new Error("Could not parse content analysis response");
  }
}

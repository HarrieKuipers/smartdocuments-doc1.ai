import anthropic, { MODELS } from "./client";
import type { AudienceAnalysis } from "./analyze-audience";

interface ContentAnalysis {
  summary: string;
  keyPoints: { text: string; explanation: string; linkedTerms: string[] }[];
  findings: { category: string; title: string; content: string }[];
}

export async function analyzeContent(
  text: string,
  audienceContext?: AudienceAnalysis
): Promise<ContentAnalysis> {
  // Chunk text if too long (max ~80k chars for context)
  const textToAnalyze = text.slice(0, 80000);

  const isInternal = audienceContext && !audienceContext.isExternal;

  const perspectiveInstruction = isInternal
    ? `\nBELANGRIJK: Dit is een intern document (type: ${audienceContext.documentType}) bedoeld voor ${audienceContext.audience}. Schrijf de samenvatting en hoofdpunten vanuit het perspectief van de medewerker/lezer die dit document moet gebruiken. Spreek de lezer direct aan (je/jij). Behoud het instructieve karakter. Vermijd het uitleggen van de organisatie zelf alsof de lezer een buitenstaander is. Focus op actiegerichte stappen en heldere interne procedures.`
    : "";

  const response = await anthropic.messages.create({
    model: MODELS.processing,
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: `Je bent een expert document-analist. Analyseer de volgende tekst en genereer:
1. Een uitgebreide samenvatting (managementniveau)
2. De belangrijkste hoofdpunten (5-10 punten) met per punt een korte uitleg van 2-3 zinnen die meer context en achtergrond geeft
3. Belangrijke bevindingen (4-6 stuks)
${perspectiveInstruction}
BELANGRIJK voor de bevindingen (findings):
- De "category" moet een korte, actiegerichte label zijn op taalniveau B1 — geen academische of abstracte termen.
- Gebruik vragen of duidelijke actietaal die de lezer direct begrijpt.
- Voorbeelden van GOEDE categorieën:
  • "De regels op een rij" (in plaats van "Juridisch")
  • "Hoe pak je dit aan?" (in plaats van "Proces" of "Onderzoeksmethodiek")
  • "Harde eisen en deadlines" (in plaats van "Handhaving" of "Procedurele vereisten")
  • "Uitzonderingen & let op" (in plaats van "Bijzondere situaties")
  • "Wat als het misgaat?" (in plaats van "Risico's" of "Handhavingsrisico's")
  • "Wat levert het op?" (in plaats van "Financieel" of "Impact")
  • "Wat gaat er veranderen?" (in plaats van "Vooruitzicht" of "Strategie")
- Kies categorieën die passen bij het specifieke document. Gebruik bovenstaande als inspiratie, niet als vaste lijst.
- De "title" moet ook in duidelijk, begrijpelijk Nederlands zijn (B1-niveau).
- De "content" is een korte beschrijving van de bevinding in eenvoudige taal.

Alle output in het Nederlands, op taalniveau B1 (korte zinnen, dagelijkse woorden).

Tekst:
${textToAnalyze}

Geef het resultaat als JSON (geen markdown, alleen JSON):
{
  "summary": "uitgebreide samenvatting van het document...",
  "keyPoints": [
    {"text": "hoofdpunt tekst", "explanation": "korte uitleg van 2-3 zinnen met meer context en achtergrond over dit hoofdpunt", "linkedTerms": ["term1", "term2"]}
  ],
  "findings": [
    {"category": "De regels op een rij", "title": "korte, duidelijke titel", "content": "beschrijving in eenvoudige taal"}
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

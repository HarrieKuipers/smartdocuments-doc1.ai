import anthropic, { MODELS } from "./client";

export interface AudienceAnalysis {
  documentType: string;
  audience: string;
  isExternal: boolean;
}

export async function analyzeAudience(text: string): Promise<AudienceAnalysis> {
  // Use first ~20k chars — enough to determine audience without wasting tokens
  const textSample = text.slice(0, 20000);

  const response = await anthropic.messages.create({
    model: MODELS.processing,
    max_tokens: 512,
    messages: [
      {
        role: "user",
        content: `Analyseer het volgende brondocument en bepaal de primaire doelgroep en het documenttype.

Let op specifieke zinsneden zoals:
- "voor intern gebruik", "werkinstructie", "handleiding", "protocol", "werkwijze", "dienstverband"
- "interne medewerkers", "inspecteurs", "behandelaars", "adviseurs"
- Instructieve of procedurele taal gericht op medewerkers

Bepaal of het document gericht is op een EXTERN publiek (burgers, klanten, het algemene publiek) of een INTERN publiek (medewerkers, inspecteurs, behandelaars).

Tekst:
${textSample}

Geef het resultaat als JSON (geen markdown, alleen JSON):
{
  "documentType": "kort type, bijv. 'Interne werkinstructie', 'Beleidsdocument', 'Jaarverslag', 'Publieksfolder'",
  "audience": "beschrijving van de doelgroep, bijv. 'Interne medewerkers / inspecteurs', 'Burgers en bedrijven', 'Algemeen publiek'",
  "isExternal": true of false
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
    throw new Error("Could not parse audience analysis response");
  }
}

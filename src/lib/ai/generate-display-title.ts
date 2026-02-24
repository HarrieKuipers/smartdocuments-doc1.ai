import anthropic, { MODELS } from "./client";

export async function generateDisplayTitle(
  title: string,
  summary: string
): Promise<string> {
  const response = await anthropic.messages.create({
    model: MODELS.processing,
    max_tokens: 256,
    messages: [
      {
        role: "user",
        content: `Je bent een communicatie-expert. Gegeven de originele documenttitel en een samenvatting, genereer een communicatieve, toegankelijke titel die de kern van het document direct duidelijk maakt voor de lezer.

Originele titel: ${title}
Samenvatting: ${summary.slice(0, 2000)}

Regels:
- De titel moet kort zijn (max 10-15 woorden)
- Gebruik begrijpelijke taal (B1 niveau)
- Maak het concreet: wat leert de lezer of waar gaat het document over?
- Geen afkortingen of jargon tenzij zeer bekend
- Geen aanhalingstekens om de titel

Geef alleen de titel terug, geen uitleg of extra tekst.`,
      },
    ],
  });

  const content = response.content[0];
  if (content.type !== "text") {
    throw new Error("Unexpected response type");
  }

  return content.text.trim().replace(/^["']|["']$/g, "");
}

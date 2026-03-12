import anthropic, { MODELS } from "./client";
import { type DocumentLanguage, getLangStrings } from "./language";

export async function generateDisplayTitle(
  title: string,
  summary: string,
  lang: DocumentLanguage = "nl"
): Promise<string> {
  const L = getLangStrings(lang);

  const response = await anthropic.messages.create({
    model: MODELS.processing,
    max_tokens: 256,
    messages: [
      {
        role: "user",
        content: `${L.displayTitlePrompt}

${lang === "nl" ? "Originele titel" : "Original title"}: ${title}
${lang === "nl" ? "Samenvatting" : "Summary"}: ${summary.slice(0, 2000)}

${L.displayTitleRules}

${lang === "nl" ? "Geef alleen de titel terug, geen uitleg of extra tekst." : "Return only the title, no explanation or extra text."}`,
      },
    ],
  });

  const content = response.content[0];
  if (content.type !== "text") {
    throw new Error("Unexpected response type");
  }

  return content.text.trim().replace(/^["']|["']$/g, "");
}

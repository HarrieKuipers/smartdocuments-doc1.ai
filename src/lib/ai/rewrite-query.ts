import anthropic, { MODELS } from "./client";

/**
 * Rewrite a user query for optimal semantic search.
 * Combines two techniques in a single fast Haiku call:
 *
 * 1. **History-aware contextualization** — resolves pronouns and references
 *    from conversation history (e.g. "and what about next year?" →
 *    "costs and expenses for next year in the annual report").
 *
 * 2. **Query expansion** — adds synonyms and related terms to improve
 *    embedding recall (especially helpful for Dutch ↔ formal/informal).
 *
 * Returns the rewritten query string optimized for vector search,
 * or falls back to the original message on any failure.
 */
export async function rewriteQuery(
  message: string,
  history: { role: string; content: string }[],
  language: "nl" | "en" = "nl"
): Promise<string> {
  // No rewrite needed for first message with no history
  const hasHistory = history.length > 0;
  const isShortVague = message.split(/\s+/).length <= 3;

  if (!hasHistory && !isShortVague) {
    return message;
  }

  try {
    const historyContext = hasHistory
      ? history
          .slice(-6) // Only recent turns
          .map((m) => `${m.role}: ${m.content.slice(0, 200)}`)
          .join("\n")
      : "";

    const prompt =
      language === "nl"
        ? `Je bent een zoekmachine-optimizer. Herschrijf de gebruikersvraag zodat deze optimaal werkt voor semantisch zoeken in een vectordatabase.

Regels:
- Als er gespreksgeschiedenis is, verwerk de context (voornaamwoorden, verwijzingen) in de zoekopdracht
- Voeg 2-3 synoniemen of gerelateerde termen toe die relevant zijn
- Houd het kort (max 30 woorden)
- Geef ALLEEN de herschreven zoekopdracht terug, niets anders
- Schrijf in het Nederlands

${hasHistory ? `Gespreksgeschiedenis:\n${historyContext}\n\n` : ""}Gebruikersvraag: ${message}

Herschreven zoekopdracht:`
        : `You are a search query optimizer. Rewrite the user question to work optimally for semantic search in a vector database.

Rules:
- If there is conversation history, resolve context (pronouns, references) into the search query
- Add 2-3 relevant synonyms or related terms
- Keep it short (max 30 words)
- Return ONLY the rewritten search query, nothing else

${hasHistory ? `Conversation history:\n${historyContext}\n\n` : ""}User question: ${message}

Rewritten search query:`;

    const response = await anthropic.messages.create({
      model: MODELS.chat,
      max_tokens: 100,
      messages: [{ role: "user", content: prompt }],
    });

    const rewritten =
      response.content[0].type === "text"
        ? response.content[0].text.trim()
        : "";

    // Sanity check: don't return empty or absurdly long rewrites
    if (rewritten.length < 3 || rewritten.length > 500) {
      return message;
    }

    return rewritten;
  } catch (err) {
    console.warn("Query rewrite failed, using original:", err);
    return message;
  }
}

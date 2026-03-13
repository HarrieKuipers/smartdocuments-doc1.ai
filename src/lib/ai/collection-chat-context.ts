interface DocContext {
  title: string;
  shortId: string;
  summary: string;
  keyPoints: string[];
  terms: string[];
}

/**
 * Build a context string from multiple documents for collection-level chat.
 * Aims to stay within reasonable token limits (~100K tokens ≈ 400K chars).
 */
export function buildCollectionContext(documents: DocContext[]): string {
  const MAX_CHARS = 300000; // ~75K tokens, leave room for system prompt + history
  let context = "";
  let totalChars = 0;

  for (const doc of documents) {
    const docBlock = [
      `\n--- Document: "${doc.title}" [ID: ${doc.shortId}] ---`,
      `Samenvatting: ${doc.summary}`,
      doc.keyPoints.length > 0
        ? `Hoofdpunten:\n${doc.keyPoints.map((kp) => `- ${kp}`).join("\n")}`
        : "",
      doc.terms.length > 0
        ? `Begrippen: ${doc.terms.join(", ")}`
        : "",
    ]
      .filter(Boolean)
      .join("\n");

    if (totalChars + docBlock.length > MAX_CHARS) {
      // Only include summary for remaining docs
      const shortBlock = `\n--- Document: "${doc.title}" [ID: ${doc.shortId}] ---\nSamenvatting: ${doc.summary.slice(0, 500)}...`;
      if (totalChars + shortBlock.length <= MAX_CHARS) {
        context += shortBlock;
        totalChars += shortBlock.length;
      }
      continue;
    }

    context += docBlock;
    totalChars += docBlock.length;
  }

  return context;
}

/**
 * Parse document references from Claude's response.
 * Claude is instructed to cite sources with [Document: "Title"] markers.
 */
export function parseDocumentReferences(
  response: string,
  documents: { title: string; shortId: string }[]
): { documentId?: string; shortId: string; title: string }[] {
  const refs: Map<string, { shortId: string; title: string }> = new Map();
  const regex = /\[Document:\s*"([^"]+)"\]/gi;
  let match;

  while ((match = regex.exec(response)) !== null) {
    const citedTitle = match[1];
    // Find the closest matching document
    const doc = documents.find(
      (d) =>
        d.title.toLowerCase() === citedTitle.toLowerCase() ||
        d.title.toLowerCase().includes(citedTitle.toLowerCase()) ||
        citedTitle.toLowerCase().includes(d.title.toLowerCase())
    );
    if (doc && !refs.has(doc.shortId)) {
      refs.set(doc.shortId, { shortId: doc.shortId, title: doc.title });
    }
  }

  return Array.from(refs.values());
}

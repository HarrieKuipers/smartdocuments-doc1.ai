import type { ChunkSearchResult } from "@/lib/pinecone";

interface DocContext {
  title: string;
  shortId: string;
  summary: string;
  keyPoints: string[];
  terms: string[];
}

/**
 * Build a context string from multiple documents for collection-level chat.
 * Used as fallback when no documents are vectorized.
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
 * Build RAG context from retrieved chunks across multiple documents.
 * Each chunk is annotated with its source document and page/section.
 */
export function buildRAGCollectionContext(
  chunks: (ChunkSearchResult & { documentId: string })[],
  documentTitles: Map<string, string>
): string {
  const contentTypeLabels: Record<string, string> = {
    table: "📊 Tabel",
    chart: "📈 Grafiek",
    diagram: "🔀 Diagram",
    "image-with-text": "🖼️ Afbeelding",
  };
  return chunks
    .map((c) => {
      const docTitle = documentTitles.get(c.documentId) || "Onbekend document";
      const label = [
        `"${docTitle}"`,
        c.page ? `Pagina ${c.page}` : null,
        c.sectionHeading || null,
        c.contentType && c.contentType !== "text"
          ? contentTypeLabels[c.contentType] || c.contentType
          : null,
      ]
        .filter(Boolean)
        .join(" - ");
      return `[Bron: ${label}]\n${c.text}`;
    })
    .join("\n\n---\n\n");
}

/**
 * Build fallback context from summaries for non-vectorized documents.
 */
export function buildFallbackContext(
  documents: { title: string; shortId: string; summary: string }[]
): string {
  if (documents.length === 0) return "";
  return documents
    .map(
      (doc) =>
        `\n--- Samenvatting: "${doc.title}" [ID: ${doc.shortId}] ---\n${doc.summary}`
    )
    .join("\n");
}

/**
 * Parse document references from Claude's response.
 * Matches bold document names like **Title** in the response text.
 */
export function parseDocumentReferences(
  response: string,
  documents: { title: string; shortId: string }[]
): { documentId?: string; shortId: string; title: string }[] {
  const refs: Map<string, { shortId: string; title: string }> = new Map();

  // Match bold text patterns: **Title** or [Document: "Title"]
  const patterns = [
    /\*\*([^*]+)\*\*/g,
    /\[Document:\s*"([^"]+)"\]/gi,
  ];

  for (const regex of patterns) {
    let match;
    while ((match = regex.exec(response)) !== null) {
      const citedTitle = match[1];
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
  }

  return Array.from(refs.values());
}

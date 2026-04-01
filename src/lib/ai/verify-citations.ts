import type { ChunkSearchResult } from "@/lib/pinecone";

export interface VerifiedSource {
  page: number | null;
  section: string;
  score: number;
  quote?: string;
  documentTitle?: string;
  documentShortId?: string;
  contentType?: string;
  pageImageUrl?: string;
}

/**
 * Verify quoted passages in an AI response against retrieved chunks.
 * Extracts all quoted text and checks for word overlap with source chunks.
 * Pure string matching — no API calls.
 */
export function verifyCitations(
  response: string,
  retrievedChunks: (ChunkSearchResult & {
    documentId?: string;
    documentTitle?: string;
    documentShortId?: string;
    pageImageUrl?: string;
  })[]
): { verifiedSources: VerifiedSource[] } {
  const verifiedSources: VerifiedSource[] = [];

  // Extract all quoted passages (text between "..." or "...")
  const quoteRegex = /["""]([^"""]{10,})["""]/g;
  let match;

  while ((match = quoteRegex.exec(response)) !== null) {
    const quotedText = match[1];
    const quotedWords = tokenize(quotedText);

    if (quotedWords.length < 3) continue;

    // Check overlap with each chunk
    let bestOverlap = 0;
    let bestChunk: (typeof retrievedChunks)[0] | null = null;

    for (const chunk of retrievedChunks) {
      const chunkWords = tokenize(chunk.text);
      const overlap = wordOverlap(quotedWords, chunkWords);
      if (overlap > bestOverlap) {
        bestOverlap = overlap;
        bestChunk = chunk;
      }
    }

    // 80%+ word overlap = verified
    if (bestOverlap >= 0.8 && bestChunk) {
      verifiedSources.push({
        page: bestChunk.page,
        section: bestChunk.sectionHeading,
        score: bestChunk.score,
        quote: quotedText,
        documentTitle: bestChunk.documentTitle,
        documentShortId: bestChunk.documentShortId,
        contentType: bestChunk.contentType,
        pageImageUrl: bestChunk.pageImageUrl,
      });
    }
  }

  // Add chunk-level sources only if their page or section is referenced in the response
  const seen = new Set<string>();
  for (const chunk of retrievedChunks) {
    const key = `${chunk.documentId || ""}|${chunk.page ?? 0}|${chunk.sectionHeading}`;
    if (seen.has(key)) continue;
    seen.add(key);

    // Skip if already added via quote verification
    const alreadyVerified = verifiedSources.some(
      (s) => s.page === chunk.page && s.section === chunk.sectionHeading
    );
    if (alreadyVerified) continue;

    // Only add if the response actually references this chunk's page or section
    const pageReferenced = chunk.page && (
      response.includes(`Pagina ${chunk.page}`) ||
      response.includes(`pagina ${chunk.page}`) ||
      response.includes(`Page ${chunk.page}`) ||
      response.includes(`page ${chunk.page}`) ||
      response.includes(`p. ${chunk.page}`)
    );
    const sectionReferenced = chunk.sectionHeading &&
      response.toLowerCase().includes(chunk.sectionHeading.toLowerCase().slice(0, 30));
    const docReferenced = chunk.documentTitle &&
      response.toLowerCase().includes(chunk.documentTitle.toLowerCase().slice(0, 40));

    if (pageReferenced || sectionReferenced || docReferenced) {
      verifiedSources.push({
        page: chunk.page,
        section: chunk.sectionHeading,
        score: chunk.score,
        documentTitle: chunk.documentTitle,
        documentShortId: chunk.documentShortId,
        contentType: chunk.contentType,
        pageImageUrl: chunk.pageImageUrl,
      });
    }
  }

  // If no sources at all (LLM didn't cite properly), add the top-scored chunk as fallback
  if (verifiedSources.length === 0 && retrievedChunks.length > 0) {
    const top = retrievedChunks[0];
    verifiedSources.push({
      page: top.page,
      section: top.sectionHeading,
      score: top.score,
      documentTitle: top.documentTitle,
      documentShortId: top.documentShortId,
      contentType: top.contentType,
      pageImageUrl: top.pageImageUrl,
    });
  }

  return { verifiedSources };
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 2);
}

function wordOverlap(a: string[], b: string[]): number {
  if (a.length === 0) return 0;
  const bSet = new Set(b);
  let matches = 0;
  for (const word of a) {
    if (bSet.has(word)) matches++;
  }
  return matches / a.length;
}

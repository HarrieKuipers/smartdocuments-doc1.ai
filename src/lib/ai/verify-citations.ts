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
 * Uses n-gram matching (industry standard) for robust citation verification
 * that handles paraphrasing better than bag-of-words while avoiding
 * false positives from common short words.
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
    const quotedTokens = tokenize(quotedText);

    if (quotedTokens.length < 3) continue;

    let bestScore = 0;
    let bestChunk: (typeof retrievedChunks)[0] | null = null;

    for (const chunk of retrievedChunks) {
      const chunkTokens = tokenize(chunk.text);
      // Use n-gram overlap for sequence-aware matching (better than bag-of-words)
      const ngramScore = ngramOverlap(quotedTokens, chunkTokens, 3);
      // Also check word overlap as fallback for short quotes
      const wordScore = wordOverlap(quotedTokens, chunkTokens);
      const score = Math.max(ngramScore, wordScore * 0.9);

      if (score > bestScore) {
        bestScore = score;
        bestChunk = chunk;
      }
    }

    // 60% n-gram overlap = verified (lower than 80% bag-of-words to allow paraphrasing)
    if (bestScore >= 0.6 && bestChunk) {
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

    const alreadyVerified = verifiedSources.some(
      (s) => s.page === chunk.page && s.section === chunk.sectionHeading
    );
    if (alreadyVerified) continue;

    // Use word-boundary regex to prevent "Page 3" matching "Page 30"
    const pageReferenced =
      chunk.page != null &&
      new RegExp(
        `\\b(?:Pagina|pagina|Page|page|p\\.)\\s*${chunk.page}\\b`
      ).test(response);
    const sectionReferenced =
      chunk.sectionHeading &&
      response
        .toLowerCase()
        .includes(chunk.sectionHeading.toLowerCase().slice(0, 30));
    const docReferenced =
      chunk.documentTitle &&
      response
        .toLowerCase()
        .includes(chunk.documentTitle.toLowerCase().slice(0, 40));

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

  // Fallback: add top-scored chunk if LLM didn't cite properly
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

/**
 * Tokenize text for matching. Keeps Dutch function words >= 3 chars
 * (het, een, van, dat, etc.) which are important for Dutch text matching.
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .split(/\s+/)
    .filter((w) => w.length >= 2);
}

/**
 * N-gram overlap: checks what fraction of n-grams from `a` appear in `b`.
 * More robust than bag-of-words because it preserves word order,
 * reducing false positives from common words appearing in different contexts.
 */
function ngramOverlap(a: string[], b: string[], n: number): number {
  if (a.length < n) return wordOverlap(a, b);

  const aNgrams = buildNgrams(a, n);
  const bNgrams = new Set(buildNgrams(b, n));

  let matches = 0;
  for (const gram of aNgrams) {
    if (bNgrams.has(gram)) matches++;
  }
  return aNgrams.length > 0 ? matches / aNgrams.length : 0;
}

function buildNgrams(tokens: string[], n: number): string[] {
  const ngrams: string[] = [];
  for (let i = 0; i <= tokens.length - n; i++) {
    ngrams.push(tokens.slice(i, i + n).join(" "));
  }
  return ngrams;
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

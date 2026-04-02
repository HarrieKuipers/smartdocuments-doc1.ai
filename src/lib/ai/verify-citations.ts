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
 * Build sources list from retrieved chunks, showing only pages that are
 * explicitly cited by the LLM in its response.
 *
 * Strategy:
 * 1. Extract all page numbers the LLM mentions (e.g. "Pagina 83", "p. 12")
 * 2. For each cited page, pick the best chunk as the source
 * 3. If the response contains quoted passages, attach them to the matching source
 * 4. Fallback: if the LLM didn't cite any page, use the top-scored chunk
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
  if (retrievedChunks.length === 0) return { verifiedSources: [] };

  // --- Step 1: Find all page numbers explicitly cited in the response ---
  const pageRegex = /\b(?:Pagina|pagina|Page|page|p\.)\s*(\d+)\b/g;
  const citedPages = new Set<number>();
  let pageMatch;
  while ((pageMatch = pageRegex.exec(response)) !== null) {
    citedPages.add(parseInt(pageMatch[1], 10));
  }

  // --- Step 2: For each cited page, find the best chunk ---
  const sourceMap = new Map<string, VerifiedSource>();

  for (const page of citedPages) {
    // Find chunks matching this page
    const pageChunks = retrievedChunks.filter((c) => c.page === page);
    if (pageChunks.length === 0) continue;

    // Pick the highest-scored chunk for this page
    const best = pageChunks.reduce((a, b) => (a.score > b.score ? a : b));
    const key = `${best.documentId || best.documentTitle || ""}|${page}`;

    sourceMap.set(key, {
      page: best.page,
      section: best.sectionHeading,
      score: best.score,
      documentTitle: best.documentTitle,
      documentShortId: best.documentShortId,
      contentType: best.contentType,
      pageImageUrl: best.pageImageUrl,
    });
  }

  // --- Step 3: Extract quotes and attach to existing sources ---
  const quoteRegex = /["""]([^"""]{10,})["""]/g;
  let quoteMatch;

  while ((quoteMatch = quoteRegex.exec(response)) !== null) {
    const quotedText = quoteMatch[1];
    const quotedTokens = tokenize(quotedText);
    if (quotedTokens.length < 3) continue;

    let bestScore = 0;
    let bestChunk: (typeof retrievedChunks)[0] | null = null;

    for (const chunk of retrievedChunks) {
      const chunkTokens = tokenize(chunk.text);
      const ngramScore = ngramOverlap(quotedTokens, chunkTokens, 3);
      const wordScore = wordOverlap(quotedTokens, chunkTokens);
      const score = Math.max(ngramScore, wordScore * 0.9);
      if (score > bestScore) {
        bestScore = score;
        bestChunk = chunk;
      }
    }

    if (bestScore >= 0.6 && bestChunk && bestChunk.page != null) {
      const key = `${bestChunk.documentId || bestChunk.documentTitle || ""}|${bestChunk.page}`;
      const existing = sourceMap.get(key);
      if (existing && !existing.quote) {
        existing.quote = quotedText;
      } else if (!existing && citedPages.size === 0) {
        // Only add quote-matched sources when the LLM didn't cite ANY page numbers
        sourceMap.set(key, {
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
  }

  // --- Step 4: Fallback — if no sources found, use the top-scored chunk ---
  if (sourceMap.size === 0) {
    const top = retrievedChunks[0];
    sourceMap.set("fallback", {
      page: top.page,
      section: top.sectionHeading,
      score: top.score,
      documentTitle: top.documentTitle,
      documentShortId: top.documentShortId,
      contentType: top.contentType,
      pageImageUrl: top.pageImageUrl,
    });
  }

  return { verifiedSources: Array.from(sourceMap.values()) };
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

import type { ChunkSearchResult } from "@/lib/pinecone";

/**
 * Reorder chunks using the "Lost in the Middle" pattern.
 * Places the most relevant chunks at the start and end of the context,
 * with less relevant chunks in the middle.
 *
 * Based on Stanford's "Lost in the Middle" paper — LLMs pay more attention
 * to information at the beginning and end of the context window.
 *
 * For small sets (3-4 chunks), keeps original relevance order since
 * LitM provides no benefit with few items.
 *
 * Input: chunks sorted by relevance (best first)
 * Output: #1, #3, #5... at start; ...#6, #4, #2 at end
 */
export function orderChunksForLLM<T extends ChunkSearchResult>(
  chunks: T[]
): T[] {
  // LitM only helps with 5+ chunks; for fewer, keep relevance order
  if (chunks.length <= 4) return chunks;

  const start: T[] = []; // even indices (0, 2, 4...) — highest relevance
  const end: T[] = []; // odd indices (1, 3, 5...) — will be reversed

  for (let i = 0; i < chunks.length; i++) {
    if (i % 2 === 0) {
      start.push(chunks[i]);
    } else {
      end.push(chunks[i]);
    }
  }

  // Reverse end so least relevant is in the middle, more relevant at the tail
  end.reverse();

  return [...start, ...end];
}

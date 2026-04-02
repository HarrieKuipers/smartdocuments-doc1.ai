import anthropic, { MODELS } from "./client";
import type { ChunkSearchResult } from "@/lib/pinecone";

/**
 * Rerank retrieved chunks using Claude Haiku as a lightweight reranker.
 * Asks the model to order chunks by relevance to the query.
 * Falls back to original score-based ordering on failure.
 *
 * Only triggers reranking when there are enough chunks to justify the
 * additional LLM call — skips for small result sets where the vector
 * search ordering is already reliable.
 */
export async function rerankChunks<T extends ChunkSearchResult>(
  query: string,
  chunks: T[],
  topN: number = 8
): Promise<T[]> {
  // Skip reranking for small sets — vector search ordering is sufficient
  if (chunks.length <= topN) return chunks;

  try {
    const numberedChunks = chunks
      .map((c, i) => `[${i}] ${c.text.slice(0, 500)}`)
      .join("\n\n");

    const response = await anthropic.messages.create({
      model: MODELS.chat,
      max_tokens: 256,
      system:
        "You are a relevance ranker. Given a query and numbered text chunks, return a JSON array of chunk indices ordered by relevance to the query (most relevant first). Return ONLY the JSON array, nothing else.",
      messages: [
        {
          role: "user",
          content: `Query: ${query}\n\nChunks:\n${numberedChunks}\n\nReturn the top ${topN} most relevant chunk indices as a JSON array (e.g. [3,1,7,0,...]):`,
        },
      ],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";
    // Allow empty arrays [] and populated arrays [1,2,3]
    const match = text.match(/\[[\d,\s]*\]/);
    if (!match) return chunks.slice(0, topN);

    const indices: number[] = JSON.parse(match[0]);

    // Empty array = model found nothing relevant
    if (indices.length === 0) return chunks.slice(0, topN);

    const reranked: T[] = [];
    const seen = new Set<number>();

    for (const idx of indices) {
      if (idx >= 0 && idx < chunks.length && !seen.has(idx)) {
        seen.add(idx);
        reranked.push(chunks[idx]);
        if (reranked.length >= topN) break;
      }
    }

    // Fill remaining slots with highest-scored chunks not yet included
    if (reranked.length < topN) {
      for (const chunk of chunks) {
        if (reranked.length >= topN) break;
        if (!seen.has(chunks.indexOf(chunk))) {
          reranked.push(chunk);
          seen.add(chunks.indexOf(chunk));
        }
      }
    }

    return reranked;
  } catch (err) {
    console.warn("Reranking failed, falling back to score ordering:", err);
    return chunks.slice(0, topN);
  }
}

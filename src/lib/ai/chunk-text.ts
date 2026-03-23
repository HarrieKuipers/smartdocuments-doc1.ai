export interface TextChunk {
  id: string;
  text: string;
  chunkIndex: number;
}

/**
 * Split text into overlapping chunks for vectorization.
 * Uses sentence-aware splitting to avoid cutting mid-sentence.
 *
 * @param text - The full document text
 * @param documentId - Used to generate unique chunk IDs
 * @param chunkSize - Target characters per chunk (~500 tokens ≈ 2000 chars)
 * @param overlap - Characters of overlap between chunks
 */
export function chunkText(
  text: string,
  documentId: string,
  chunkSize: number = 2000,
  overlap: number = 200
): TextChunk[] {
  if (!text || text.trim().length === 0) return [];

  // Split into sentences (supports Dutch and English punctuation)
  const sentences = text.match(/[^.!?\n]+[.!?\n]+|[^.!?\n]+$/g) || [text];

  const chunks: TextChunk[] = [];
  let currentChunk = "";
  let chunkIndex = 0;

  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    if (!trimmed) continue;

    // If adding this sentence would exceed chunk size, save current chunk
    if (currentChunk.length + trimmed.length > chunkSize && currentChunk.length > 0) {
      chunks.push({
        id: `${documentId}_chunk_${chunkIndex}`,
        text: currentChunk.trim(),
        chunkIndex,
      });
      chunkIndex++;

      // Start new chunk with overlap from end of previous chunk
      const overlapText = currentChunk.slice(-overlap);
      currentChunk = overlapText + " " + trimmed;
    } else {
      currentChunk += (currentChunk ? " " : "") + trimmed;
    }
  }

  // Don't forget the last chunk
  if (currentChunk.trim().length > 0) {
    chunks.push({
      id: `${documentId}_chunk_${chunkIndex}`,
      text: currentChunk.trim(),
      chunkIndex,
    });
  }

  return chunks;
}

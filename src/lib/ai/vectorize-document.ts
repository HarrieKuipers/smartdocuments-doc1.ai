import { chunkText } from "./chunk-text";
import { upsertChunks, ensureIndex } from "@/lib/pinecone";

/**
 * Vectorize a document's text and store chunks in Pinecone.
 * Uses integrated inference (Pinecone handles embedding via multilingual-e5-large).
 *
 * @param documentId - MongoDB document ID (used as Pinecone namespace)
 * @param text - Full extracted document text
 * @param language - Document language for metadata
 */
export async function vectorizeDocument(
  documentId: string,
  text: string,
  language: string = "nl"
): Promise<number> {
  // Ensure index exists
  await ensureIndex();

  // Chunk the text
  const chunks = chunkText(text, documentId);

  if (chunks.length === 0) {
    console.warn(`No chunks generated for document ${documentId}`);
    return 0;
  }

  // Prepare chunks with metadata for Pinecone
  const pineconeChunks = chunks.map((chunk) => ({
    id: chunk.id,
    text: chunk.text,
    metadata: {
      document_id: documentId,
      chunk_index: chunk.chunkIndex,
      language,
      char_count: chunk.text.length,
    },
  }));

  // Upsert to Pinecone
  await upsertChunks(documentId, pineconeChunks);

  console.log(
    `Vectorized document ${documentId}: ${chunks.length} chunks stored in Pinecone`
  );

  return chunks.length;
}

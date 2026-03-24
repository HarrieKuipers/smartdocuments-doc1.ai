import { chunkText } from "./chunk-text";
import { upsertChunks, deleteDocumentVectors, ensureIndex } from "@/lib/pinecone";

/**
 * Vectorize a document's text and store chunks in Pinecone with rich metadata.
 * Uses integrated inference (Pinecone handles embedding via multilingual-e5-large).
 *
 * Metadata stored per chunk:
 * - document_id: MongoDB document ID
 * - chunk_index: Sequential index of this chunk
 * - page: Estimated page number (0 if unknown)
 * - paragraph_index: Paragraph number within the document
 * - section_heading: Detected section/chapter heading
 * - char_offset: Character offset from start of document
 * - char_count: Number of characters in this chunk
 * - is_new_section: Whether this chunk starts a new section
 * - language: Document language (nl/en)
 *
 * @param documentId - MongoDB document ID (used as Pinecone namespace)
 * @param text - Full extracted document text
 * @param language - Document language for metadata
 * @param pageCount - Known page count from PDF extraction (helps page estimation)
 */
export async function vectorizeDocument(
  documentId: string,
  text: string,
  language: string = "nl",
  pageCount?: number
): Promise<number> {
  // Ensure index exists
  await ensureIndex();

  // Delete existing vectors for this document (in case of re-index)
  try {
    await deleteDocumentVectors(documentId);
  } catch {
    // Namespace may not exist yet, that's fine
  }

  // Chunk the text with metadata
  const chunks = chunkText(text, documentId, 2000, 200, pageCount);

  if (chunks.length === 0) {
    console.warn(`No chunks generated for document ${documentId}`);
    return 0;
  }

  // Prepare chunks with rich metadata for Pinecone
  const pineconeChunks = chunks.map((chunk) => ({
    id: chunk.id,
    text: chunk.text,
    metadata: {
      document_id: documentId,
      chunk_index: chunk.chunkIndex,
      page: chunk.page ?? 0,
      paragraph_index: chunk.paragraphIndex,
      section_heading: chunk.sectionHeading || "",
      char_offset: chunk.charOffset,
      char_count: chunk.text.length,
      is_new_section: chunk.isNewSection ? 1 : 0,
      language,
    },
  }));

  // Upsert to Pinecone
  await upsertChunks(documentId, pineconeChunks);

  console.log(
    `Vectorized document ${documentId}: ${chunks.length} chunks stored in Pinecone`
  );

  return chunks.length;
}

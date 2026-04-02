import { chunkText, type TextChunk } from "./chunk-text";
import { upsertChunks, deleteDocumentVectors, ensureIndex } from "@/lib/pinecone";
import type { VisualContent } from "./extract-visual-content";

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
 * - content_type: "text", "table", "chart", or "diagram"
 *
 * @param documentId - MongoDB document ID (used as Pinecone namespace)
 * @param text - Full extracted document text
 * @param language - Document language for metadata
 * @param pageCount - Known page count from PDF extraction (helps page estimation)
 * @param visualContent - Optional extracted visual content to interleave
 * @param pageImageUrls - Optional map of page number → 72 DPI S3 image URL
 * @param highResPageImageUrls - Optional map of page number → 150 DPI S3 image URL (for visual pages)
 * @param pageLabelOffset - Number of physical pages before the first labeled "1" (cover pages)
 */
export async function vectorizeDocument(
  documentId: string,
  text: string,
  language: string = "nl",
  pageCount?: number,
  visualContent?: VisualContent[],
  pageImageUrls?: Map<number, string>,
  highResPageImageUrls?: Map<number, string>,
  pageLabelOffset: number = 0
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
  const textChunks = chunkText(text, documentId, 2000, 200, pageCount, pageLabelOffset);

  // Create visual content chunks
  const visualChunks: TextChunk[] = [];
  if (visualContent && visualContent.length > 0) {
    for (const vc of visualContent) {
      const physicalPage = vc.pageIndex + 1; // 0-based to 1-based physical
      const displayPage = Math.max(1, physicalPage - pageLabelOffset);
      const prefix =
        vc.contentType === "table"
          ? `[Tabel op Pagina ${displayPage}]`
          : vc.contentType === "chart"
            ? `[Grafiek op Pagina ${displayPage}]`
            : `[Diagram op Pagina ${displayPage}]`;

      // Build chunk text from description + table markdown
      const chunkTextContent = [
        prefix,
        vc.description,
        vc.tableMarkdown ? `\n${vc.tableMarkdown}` : "",
        vc.dataPoints ? `\nData: ${vc.dataPoints}` : "",
      ]
        .filter(Boolean)
        .join("\n");

      visualChunks.push({
        id: "", // Will be assigned below
        text: chunkTextContent,
        chunkIndex: 0, // Will be assigned below
        page: displayPage,
        paragraphIndex: 0,
        sectionHeading: prefix,
        charOffset: 0,
        isNewSection: false,
        contentType: vc.contentType === "image-with-text" ? "diagram" : vc.contentType,
        visualDescription: vc.description,
        tableMarkdown: vc.tableMarkdown,
        // Maps are keyed by PHYSICAL page number
        pageImageUrl: highResPageImageUrls?.get(physicalPage) || pageImageUrls?.get(physicalPage),
      });
    }
  }

  // Interleave visual chunks at correct page positions
  const allChunks: TextChunk[] = [];
  let textIdx = 0;
  let visualIdx = 0;

  // Sort visual chunks by page
  visualChunks.sort((a, b) => (a.page ?? 0) - (b.page ?? 0));

  while (textIdx < textChunks.length || visualIdx < visualChunks.length) {
    if (textIdx < textChunks.length && visualIdx < visualChunks.length) {
      const textPage = textChunks[textIdx].page ?? Infinity;
      const visualPage = visualChunks[visualIdx].page ?? Infinity;
      if (textPage <= visualPage) {
        allChunks.push(textChunks[textIdx++]);
      } else {
        allChunks.push(visualChunks[visualIdx++]);
      }
    } else if (textIdx < textChunks.length) {
      allChunks.push(textChunks[textIdx++]);
    } else {
      allChunks.push(visualChunks[visualIdx++]);
    }
  }

  // Re-index chunks
  for (let i = 0; i < allChunks.length; i++) {
    allChunks[i].id = `${documentId}_chunk_${i}`;
    allChunks[i].chunkIndex = i;
  }

  if (allChunks.length === 0) {
    console.warn(`No chunks generated for document ${documentId}`);
    return 0;
  }

  // Prepare chunks with rich metadata for Pinecone
  const pineconeChunks = allChunks.map((chunk) => {
    // For visual chunks, prefer high-res URL; for text chunks, use 72 DPI thumbnail
    // Maps are keyed by PHYSICAL page number, so add offset back for lookup
    const displayPage = chunk.page ?? 0;
    const physicalPage = displayPage > 0 ? displayPage + pageLabelOffset : 0;
    const imageUrl =
      chunk.pageImageUrl || // Visual chunk already has high-res URL set
      (physicalPage > 0 ? (highResPageImageUrls?.get(physicalPage) || pageImageUrls?.get(physicalPage)) : undefined);

    return {
      id: chunk.id,
      text: chunk.text,
      metadata: {
        document_id: documentId,
        chunk_index: chunk.chunkIndex,
        page: displayPage,
        paragraph_index: chunk.paragraphIndex,
        section_heading: chunk.sectionHeading || "",
        char_offset: chunk.charOffset,
        char_count: chunk.text.length,
        is_new_section: chunk.isNewSection ? 1 : 0,
        language,
        content_type: chunk.contentType || "text",
        ...(imageUrl ? { page_image_url: imageUrl } : {}),
      },
    };
  });

  // Upsert to Pinecone
  await upsertChunks(documentId, pineconeChunks);

  console.log(
    `Vectorized document ${documentId}: ${allChunks.length} chunks stored in Pinecone (${textChunks.length} text, ${visualChunks.length} visual)`
  );

  return allChunks.length;
}

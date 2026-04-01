import { Pinecone } from "@pinecone-database/pinecone";

const INDEX_NAME = "doc1-documents";

let _pinecone: Pinecone | null = null;

function getPineconeClient(): Pinecone {
  if (!_pinecone) {
    _pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY!,
    });
  }
  return _pinecone;
}

export function getIndex() {
  return getPineconeClient().index(INDEX_NAME);
}

/**
 * Upsert text chunks into Pinecone using integrated inference (no external embeddings needed).
 * Each chunk is stored with the document's namespace for easy cleanup.
 */
export async function upsertChunks(
  documentId: string,
  chunks: { id: string; text: string; metadata: Record<string, string | number> }[]
) {
  const index = getIndex();
  const namespace = index.namespace(documentId);

  // Pinecone integrated inference: send records with text field
  const records = chunks.map((chunk) => ({
    _id: chunk.id,
    chunk_text: chunk.text,
    ...chunk.metadata,
  }));

  // Upsert in batches of 96 (Pinecone recommended limit for integrated indexes)
  // Includes retry with exponential backoff for rate limits (429)
  const batchSize = 96;
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);

    let attempt = 0;
    const maxRetries = 5;
    while (true) {
      try {
        await namespace.upsertRecords({ records: batch });
        break;
      } catch (err: unknown) {
        const isRateLimit =
          err instanceof Error &&
          (err.message.includes("429") || err.message.includes("RESOURCE_EXHAUSTED"));
        if (isRateLimit && attempt < maxRetries) {
          attempt++;
          const delay = Math.min(2000 * Math.pow(2, attempt), 30000);
          console.warn(`Pinecone rate limit hit, retrying batch in ${delay}ms (attempt ${attempt}/${maxRetries})`);
          await new Promise((r) => setTimeout(r, delay));
        } else {
          throw err;
        }
      }
    }

    // Throttle between batches to stay under embedding TPM limits
    if (i + batchSize < records.length) {
      await new Promise((r) => setTimeout(r, 500));
    }
  }
}

export interface ChunkSearchResult {
  text: string;
  score: number;
  chunkIndex: number;
  page: number | null;
  sectionHeading: string;
  paragraphIndex: number;
  charOffset: number;
  contentType?: string;
  /** S3 URL to page image (150 DPI for visual pages, 72 DPI for text pages) */
  pageImageUrl?: string;
}

/**
 * Search for relevant chunks using semantic search.
 * Returns the top-k most relevant text chunks with full metadata.
 */
export async function searchChunks(
  documentId: string,
  query: string,
  topK: number = 8
): Promise<ChunkSearchResult[]> {
  const index = getIndex();
  const namespace = index.namespace(documentId);

  const results = await namespace.searchRecords({
    query: { topK, inputs: { text: query } },
    fields: [
      "chunk_text",
      "chunk_index",
      "page",
      "section_heading",
      "paragraph_index",
      "char_offset",
      "content_type",
      "page_image_url",
    ],
  });

  return (results.result?.hits || []).map((hit) => {
    const fields = hit.fields as Record<string, unknown> | undefined;
    const page = fields?.page as number | undefined;
    return {
      text: (fields?.chunk_text as string) || "",
      score: hit._score || 0,
      chunkIndex: (fields?.chunk_index as number) || 0,
      page: page && page > 0 ? page : null,
      sectionHeading: (fields?.section_heading as string) || "",
      paragraphIndex: (fields?.paragraph_index as number) || 0,
      charOffset: (fields?.char_offset as number) || 0,
      contentType: (fields?.content_type as string) || undefined,
      pageImageUrl: (fields?.page_image_url as string) || undefined,
    };
  });
}

/**
 * Delete all vectors for a document (by namespace).
 */
export async function deleteDocumentVectors(documentId: string) {
  const index = getIndex();
  const namespace = index.namespace(documentId);
  await namespace.deleteAll();
}

/**
 * Ensure the Pinecone index exists. Creates it if it doesn't.
 * Uses multilingual-e5-large for Dutch + English support.
 */
export async function ensureIndex() {
  const pc = getPineconeClient();

  const existing = await pc.listIndexes();
  const indexExists = existing.indexes?.some((idx) => idx.name === INDEX_NAME);

  if (!indexExists) {
    await pc.createIndexForModel({
      name: INDEX_NAME,
      cloud: "aws",
      region: "us-east-1",
      embed: {
        model: "multilingual-e5-large",
        fieldMap: { text: "chunk_text" },
      },
    });
    // Wait for index to be ready
    let ready = false;
    for (let i = 0; i < 30; i++) {
      const desc = await pc.describeIndex(INDEX_NAME);
      if (desc.status?.ready) {
        ready = true;
        break;
      }
      await new Promise((r) => setTimeout(r, 2000));
    }
    if (!ready) {
      throw new Error("Pinecone index creation timed out");
    }
  }
}

/**
 * Search for relevant chunks across multiple documents in parallel.
 * Fans out queries to each document's namespace and merges results by score.
 */
export async function searchMultipleDocuments(
  documentIds: string[],
  query: string,
  topKPerDoc: number = 5,
  globalTopK: number = 20
): Promise<(ChunkSearchResult & { documentId: string })[]> {
  const results = await Promise.all(
    documentIds.map(async (docId) => {
      try {
        const chunks = await searchChunks(docId, query, topKPerDoc);
        return chunks.map((chunk) => ({ ...chunk, documentId: docId }));
      } catch (err) {
        console.warn(`Pinecone search failed for document ${docId}:`, err);
        return [];
      }
    })
  );

  return results
    .flat()
    .sort((a, b) => b.score - a.score)
    .slice(0, globalTopK);
}

export default getPineconeClient;

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
  const batchSize = 96;
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    await namespace.upsertRecords({ records: batch });
  }
}

/**
 * Search for relevant chunks using semantic search.
 * Returns the top-k most relevant text chunks for a given query.
 */
export async function searchChunks(
  documentId: string,
  query: string,
  topK: number = 5
): Promise<{ text: string; score: number; chunkIndex: number }[]> {
  const index = getIndex();
  const namespace = index.namespace(documentId);

  const results = await namespace.searchRecords({
    query: { topK, inputs: { text: query } },
    fields: ["chunk_text", "chunk_index"],
  });

  return (results.result?.hits || []).map((hit) => {
    const fields = hit.fields as Record<string, unknown> | undefined;
    return {
      text: (fields?.chunk_text as string) || "",
      score: hit._score || 0,
      chunkIndex: (fields?.chunk_index as number) || 0,
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

export default getPineconeClient;

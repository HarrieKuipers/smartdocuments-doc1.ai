/**
 * Shared utilities for the RAG pipeline.
 * Centralizes patterns and constants used across chat routes
 * and collection context builders to avoid duplication.
 */

/** Pattern to detect broad/summary questions that benefit from document-level context */
export const BROAD_QUERY_PATTERN =
  /samenvat|hoofdpunt|overzicht|overview|summary|main point|key point|samengevat|kernpunt|belangrijk/i;

/** Human-readable labels for visual content types */
export const CONTENT_TYPE_LABELS: Record<string, string> = {
  table: "\u{1F4CA} Tabel",
  chart: "\u{1F4C8} Grafiek",
  diagram: "\u{1F500} Diagram",
  "image-with-text": "\u{1F5BC}\uFE0F Afbeelding",
};

/** Maximum message length to accept in chat endpoints */
export const MAX_MESSAGE_LENGTH = 2000;

/** Minimum vector search score to include a chunk */
export const SCORE_THRESHOLD = 0.3;

/**
 * Validate and sanitize a chat message input.
 * Returns the trimmed message or null if invalid.
 */
export function validateChatMessage(
  message: unknown
): string | null {
  if (!message || typeof message !== "string") return null;
  const trimmed = message.trim();
  if (trimmed.length === 0 || trimmed.length > MAX_MESSAGE_LENGTH) return null;
  return trimmed;
}

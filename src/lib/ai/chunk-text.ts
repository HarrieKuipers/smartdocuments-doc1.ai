export interface TextChunk {
  id: string;
  text: string;
  chunkIndex: number;
  /** Estimated page number (1-based), null if unknown */
  page: number | null;
  /** Paragraph index within the page/section */
  paragraphIndex: number;
  /** Section heading this chunk belongs to, if detected */
  sectionHeading: string;
  /** Character offset from start of document */
  charOffset: number;
  /** Whether this chunk starts a new section */
  isNewSection: boolean;
  /** Content type: text, table, chart, or diagram */
  contentType?: "text" | "table" | "chart" | "diagram";
  /** Natural language description of visual content */
  visualDescription?: string;
  /** Markdown representation of table data */
  tableMarkdown?: string;
  /** URL to rendered page image in S3 */
  pageImageUrl?: string;
}

interface PageBoundary {
  charOffset: number;
  pageNumber: number;
}

/**
 * Detect page boundaries from common PDF page break patterns.
 * pdf-parse inserts form-feed (\f) or page-break markers between pages.
 */
function detectPageBoundaries(text: string): PageBoundary[] {
  const boundaries: PageBoundary[] = [{ charOffset: 0, pageNumber: 1 }];
  let pageNumber = 1;

  // Match form-feed chars (common in pdf-parse output), or "--- Page X ---" style markers
  const pageBreakRegex = /\f|(?:\n-{3,}\s*(?:Page|Pagina)\s+\d+\s*-{3,}\n)/g;
  let match;
  while ((match = pageBreakRegex.exec(text)) !== null) {
    pageNumber++;
    boundaries.push({ charOffset: match.index + match[0].length, pageNumber });
  }

  return boundaries;
}

/**
 * Get estimated page number for a character offset.
 */
function getPageForOffset(
  offset: number,
  boundaries: PageBoundary[]
): number | null {
  if (boundaries.length <= 1) return null; // No page info available
  for (let i = boundaries.length - 1; i >= 0; i--) {
    if (offset >= boundaries[i].charOffset) {
      return boundaries[i].pageNumber;
    }
  }
  return 1;
}

/**
 * Detect if a line is likely a section heading.
 * Matches: numbered headings (1.2.3), ALL CAPS lines, short bold-looking lines, etc.
 */
function detectHeading(line: string): string | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length > 120) return null;

  // Numbered heading: "1.", "1.2", "1.2.3", "Hoofdstuk 1", "Article 1"
  if (/^(?:\d+\.)+\s*\S/.test(trimmed)) return trimmed;
  if (/^(?:Hoofdstuk|Chapter|Artikel|Article|Sectie|Section)\s+\d+/i.test(trimmed)) return trimmed;

  // ALL CAPS line (min 4 chars, max 100) that isn't just an abbreviation
  if (trimmed.length >= 4 && trimmed.length <= 100 && trimmed === trimmed.toUpperCase() && /[A-Z]{4,}/.test(trimmed)) {
    return trimmed;
  }

  // Short line (< 80 chars) followed by a blank line — heuristic for titles
  // We can't check "followed by blank" here, but short standalone lines that
  // don't end with sentence punctuation are likely headings
  if (trimmed.length <= 80 && !/[.!?,;:]$/.test(trimmed) && /^[A-ZÀ-ÖÙ-Ý0-9]/.test(trimmed)) {
    return trimmed;
  }

  return null;
}

/**
 * Split text into overlapping chunks with rich metadata for vectorization.
 * Tracks page numbers, paragraphs, section headings, and character offsets.
 *
 * @param text - The full document text
 * @param documentId - Used to generate unique chunk IDs
 * @param chunkSize - Target characters per chunk (~500 tokens = 2000 chars)
 * @param overlap - Characters of overlap between chunks
 * @param pageCount - Optional known page count (for estimation if no page breaks found)
 * @param pageLabelOffset - Number of physical pages before the first labeled "1" (cover pages)
 */
export function chunkText(
  text: string,
  documentId: string,
  chunkSize: number = 2000,
  overlap: number = 200,
  pageCount?: number,
  pageLabelOffset: number = 0
): TextChunk[] {
  if (!text || text.trim().length === 0) return [];

  const pageBoundaries = detectPageBoundaries(text);
  const hasRealPageBreaks = pageBoundaries.length > 1;

  /** Apply page label offset: convert physical page to display page */
  const toDisplayPage = (physicalPage: number | null): number | null => {
    if (physicalPage === null) return null;
    const display = physicalPage - pageLabelOffset;
    return display >= 1 ? display : null;
  };

  // If no real page breaks but we know page count, estimate evenly
  const charsPerPage =
    !hasRealPageBreaks && pageCount && pageCount > 1
      ? text.length / pageCount
      : 0;

  // Split into paragraphs (double newline or single newline with indent)
  let segments = text.split(/\n\s*\n|\n(?=\s{2,})/).filter((p) => p.trim().length > 0);

  // If we get very few segments relative to text length, fallback to sentence splitting
  // This handles documents without proper paragraph breaks (e.g. some PDFs)
  if (segments.length < text.length / 10000) {
    segments = text.match(/[^.!?\n]+[.!?\n]+|[^.!?\n]+$/g) || [text];
  }

  const chunks: TextChunk[] = [];
  let currentChunk = "";
  let chunkIndex = 0;
  let currentHeading = "";
  let charOffset = 0;
  let paragraphIndex = 0;
  let chunkStartOffset = 0;
  let chunkStartParagraph = 0;
  let isNewSection = false;

  for (const segment of segments) {
    const trimmed = segment.trim();
    if (!trimmed) continue;

    // Check if this paragraph is a heading
    const lines = trimmed.split("\n");
    const firstLineHeading = detectHeading(lines[0]);
    if (firstLineHeading) {
      currentHeading = firstLineHeading;
      isNewSection = true;
    }

    // If adding this paragraph exceeds chunk size, save current chunk
    if (
      currentChunk.length + trimmed.length > chunkSize &&
      currentChunk.length > 0
    ) {
      const rawPage = hasRealPageBreaks
        ? getPageForOffset(chunkStartOffset, pageBoundaries)
        : charsPerPage > 0
          ? Math.ceil((chunkStartOffset + 1) / charsPerPage)
          : null;

      chunks.push({
        id: `${documentId}_chunk_${chunkIndex}`,
        text: currentChunk.trim(),
        chunkIndex,
        page: toDisplayPage(rawPage),
        paragraphIndex: chunkStartParagraph,
        sectionHeading: currentHeading,
        charOffset: chunkStartOffset,
        isNewSection,
      });
      chunkIndex++;
      isNewSection = false;

      // Start new chunk with overlap from end of previous
      const overlapText = currentChunk.slice(-overlap);
      currentChunk = overlapText + "\n\n" + trimmed;
      chunkStartOffset = charOffset - overlap;
      chunkStartParagraph = paragraphIndex;
    } else {
      if (currentChunk.length === 0) {
        chunkStartOffset = charOffset;
        chunkStartParagraph = paragraphIndex;
      }
      currentChunk += (currentChunk ? "\n\n" : "") + trimmed;
    }

    charOffset += segment.length;
    paragraphIndex++;
  }

  // Last chunk
  if (currentChunk.trim().length > 0) {
    const rawPage = hasRealPageBreaks
      ? getPageForOffset(chunkStartOffset, pageBoundaries)
      : charsPerPage > 0
        ? Math.ceil((chunkStartOffset + 1) / charsPerPage)
        : null;

    chunks.push({
      id: `${documentId}_chunk_${chunkIndex}`,
      text: currentChunk.trim(),
      chunkIndex,
      page: toDisplayPage(rawPage),
      paragraphIndex: chunkStartParagraph,
      sectionHeading: currentHeading,
      charOffset: chunkStartOffset,
      isNewSection,
    });
  }

  // Safety: force-split any chunks that are still too large (>8000 chars)
  // This prevents Pinecone metadata size limit errors
  const safeChunks: TextChunk[] = [];
  for (const chunk of chunks) {
    if (chunk.text.length > 8000) {
      for (let start = 0; start < chunk.text.length; start += chunkSize) {
        safeChunks.push({
          ...chunk,
          id: `${documentId}_chunk_${safeChunks.length}`,
          text: chunk.text.slice(start, start + chunkSize),
          chunkIndex: safeChunks.length,
        });
      }
    } else {
      safeChunks.push({
        ...chunk,
        id: `${documentId}_chunk_${safeChunks.length}`,
        chunkIndex: safeChunks.length,
      });
    }
  }

  return safeChunks;
}

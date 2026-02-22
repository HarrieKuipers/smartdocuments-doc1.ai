/**
 * Dynamic chunker for document text.
 * Splits text into manageable chunks for AI processing while preserving structure.
 */

export interface DocumentSection {
  id: string;
  title: string;
  level: number; // heading level (1-4)
  content: string;
  index: number;
}

export interface TextChunk {
  id: string;
  sectionId: string;
  sectionTitle: string;
  text: string;
  startIndex: number;
  endIndex: number;
}

const MAX_CHUNK_TOKENS = 600;
const OVERLAP_TOKENS = 150;
const APPROX_CHARS_PER_TOKEN = 4; // rough estimate for Dutch text

/**
 * Extract document sections from plain text.
 * Identifies headings by common patterns (markdown-style or numbered).
 */
export function extractSections(text: string): DocumentSection[] {
  const lines = text.split("\n");
  const sections: DocumentSection[] = [];
  let currentSection: DocumentSection | null = null;
  let contentLines: string[] = [];
  let sectionIndex = 0;

  for (const line of lines) {
    const headingMatch = line.match(
      /^(#{1,4})\s+(.+)$|^(\d+\.(?:\d+\.)*)\s+(.+)$/
    );

    if (headingMatch) {
      // Save previous section
      if (currentSection) {
        currentSection.content = contentLines.join("\n").trim();
        if (currentSection.content) {
          sections.push(currentSection);
        }
      }

      const level = headingMatch[1]
        ? headingMatch[1].length
        : (headingMatch[3]?.split(".").filter(Boolean).length || 1);
      const title = headingMatch[2] || headingMatch[4] || "";

      currentSection = {
        id: `section-${sectionIndex}`,
        title: title.trim(),
        level,
        content: "",
        index: sectionIndex,
      };
      contentLines = [];
      sectionIndex++;
    } else {
      contentLines.push(line);
    }
  }

  // Save last section
  if (currentSection) {
    currentSection.content = contentLines.join("\n").trim();
    if (currentSection.content) {
      sections.push(currentSection);
    }
  }

  // If no sections found, treat entire text as one section
  if (sections.length === 0 && text.trim()) {
    sections.push({
      id: "section-0",
      title: "Document",
      level: 1,
      content: text.trim(),
      index: 0,
    });
  }

  return sections;
}

/**
 * Split a section into chunks based on token limits.
 */
export function chunkSection(section: DocumentSection): TextChunk[] {
  const maxChars = MAX_CHUNK_TOKENS * APPROX_CHARS_PER_TOKEN;
  const overlapChars = OVERLAP_TOKENS * APPROX_CHARS_PER_TOKEN;
  const text = section.content;

  if (text.length <= maxChars) {
    return [
      {
        id: `${section.id}-chunk-0`,
        sectionId: section.id,
        sectionTitle: section.title,
        text,
        startIndex: 0,
        endIndex: text.length,
      },
    ];
  }

  const chunks: TextChunk[] = [];
  let start = 0;
  let chunkIndex = 0;

  while (start < text.length) {
    let end = Math.min(start + maxChars, text.length);

    // Try to break at sentence boundary
    if (end < text.length) {
      const lastPeriod = text.lastIndexOf(".", end);
      const lastNewline = text.lastIndexOf("\n", end);
      const breakPoint = Math.max(lastPeriod, lastNewline);
      if (breakPoint > start + maxChars * 0.5) {
        end = breakPoint + 1;
      }
    }

    chunks.push({
      id: `${section.id}-chunk-${chunkIndex}`,
      sectionId: section.id,
      sectionTitle: section.title,
      text: text.slice(start, end),
      startIndex: start,
      endIndex: end,
    });

    start = end - overlapChars;
    if (start >= text.length) break;
    chunkIndex++;
  }

  return chunks;
}

/**
 * Chunk the entire document text into processable chunks.
 */
export function chunkDocument(text: string): {
  sections: DocumentSection[];
  chunks: TextChunk[];
} {
  const sections = extractSections(text);
  const chunks: TextChunk[] = [];

  for (const section of sections) {
    chunks.push(...chunkSection(section));
  }

  return { sections, chunks };
}

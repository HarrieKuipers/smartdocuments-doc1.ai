import { PDFParse } from "pdf-parse";
import * as mammoth from "mammoth";

/**
 * Detect the page label offset from PDF metadata.
 * Many PDFs have a cover page where printed numbering starts on page 2.
 * Returns the number of physical pages before the first page labeled "1".
 * E.g., if physical page 1 is a cover and physical page 2 is labeled "1", returns 1.
 */
async function detectPageLabelOffset(parser: PDFParse): Promise<number> {
  try {
    // Access the underlying pdfjs document for page label metadata
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const doc = await (parser as any).load();
    const labels: string[] | null = await doc.getPageLabels();
    if (!labels || labels.length === 0) return 0;

    // Find the first page whose label is "1"
    const idx = labels.findIndex((l) => l === "1");
    if (idx <= 0) return 0; // No offset or "1" is already the first page

    return idx;
  } catch {
    return 0;
  }
}

export async function extractTextFromPdf(buffer: Buffer): Promise<{
  text: string;
  pageCount: number;
  pageLabelOffset: number;
}> {
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  const result = await parser.getText();
  const pageLabelOffset = await detectPageLabelOffset(parser);
  return {
    text: result.pages?.map((p) => p.text).join("\f") || "",
    pageCount: result.pages?.length || 0,
    pageLabelOffset,
  };
}

export async function extractTextFromDocx(buffer: Buffer): Promise<{
  text: string;
}> {
  const result = await mammoth.extractRawText({ buffer });
  return { text: result.value };
}

export async function extractText(
  buffer: Buffer,
  mimeType: string
): Promise<{ text: string; pageCount?: number; pageLabelOffset?: number }> {
  if (mimeType === "application/pdf") {
    return extractTextFromPdf(buffer);
  }
  if (
    mimeType ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    return extractTextFromDocx(buffer);
  }
  throw new Error(`Unsupported file type: ${mimeType}`);
}

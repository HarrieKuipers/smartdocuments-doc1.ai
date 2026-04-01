import { PDFParse } from "pdf-parse";
import * as mammoth from "mammoth";

export async function extractTextFromPdf(buffer: Buffer): Promise<{
  text: string;
  pageCount: number;
}> {
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  const result = await parser.getText();
  return {
    text: result.pages?.map((p) => p.text).join("\f") || "",
    pageCount: result.pages?.length || 0,
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
): Promise<{ text: string; pageCount?: number }> {
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

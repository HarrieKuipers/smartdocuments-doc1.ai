import * as mupdf from "mupdf";

/**
 * Render a single PDF page to a PNG buffer using mupdf WASM.
 * Note: mupdf operations are synchronous (WASM). These functions are
 * NOT async — they return plain values to avoid misleading callers
 * about event-loop behavior.
 */
export function renderPdfPage(
  pdfBuffer: Buffer,
  pageIndex: number,
  dpi: number = 150
): Buffer {
  const doc = mupdf.Document.openDocument(pdfBuffer, "application/pdf");
  try {
    const pageCount = doc.countPages();
    if (pageIndex < 0 || pageIndex >= pageCount) {
      throw new Error(
        `Page index ${pageIndex} out of range (document has ${pageCount} pages)`
      );
    }
    const page = doc.loadPage(pageIndex);
    const scale = dpi / 72;
    const matrix = mupdf.Matrix.scale(scale, scale);
    const pixmap = page.toPixmap(matrix, mupdf.ColorSpace.DeviceRGB, false);
    const pngData = pixmap.asPNG();
    pixmap.destroy();
    page.destroy();
    return Buffer.from(pngData);
  } finally {
    doc.destroy();
  }
}

/**
 * Render multiple PDF pages to PNG buffers.
 * Opens the document once and renders all requested pages.
 */
export function renderPages(
  pdfBuffer: Buffer,
  pageIndices: number[],
  dpi: number = 150
): Buffer[] {
  const doc = mupdf.Document.openDocument(pdfBuffer, "application/pdf");
  const pageCount = doc.countPages();
  const scale = dpi / 72;
  const matrix = mupdf.Matrix.scale(scale, scale);

  try {
    return pageIndices.map((pageIndex) => {
      if (pageIndex < 0 || pageIndex >= pageCount) {
        throw new Error(
          `Page index ${pageIndex} out of range (document has ${pageCount} pages)`
        );
      }
      const page = doc.loadPage(pageIndex);
      const pixmap = page.toPixmap(matrix, mupdf.ColorSpace.DeviceRGB, false);
      const pngData = pixmap.asPNG();
      pixmap.destroy();
      page.destroy();
      return Buffer.from(pngData);
    });
  } finally {
    doc.destroy();
  }
}

/**
 * Render all pages of a PDF to PNG buffers.
 * Warning: holds all page buffers in memory — use renderPages with
 * batched indices for large documents to control memory usage.
 */
export function renderAllPages(
  pdfBuffer: Buffer,
  dpi: number = 150
): Buffer[] {
  const doc = mupdf.Document.openDocument(pdfBuffer, "application/pdf");
  const pageCount = doc.countPages();
  const scale = dpi / 72;
  const matrix = mupdf.Matrix.scale(scale, scale);

  try {
    const pngBuffers: Buffer[] = [];
    for (let i = 0; i < pageCount; i++) {
      const page = doc.loadPage(i);
      const pixmap = page.toPixmap(matrix, mupdf.ColorSpace.DeviceRGB, false);
      const pngData = pixmap.asPNG();
      pixmap.destroy();
      page.destroy();
      pngBuffers.push(Buffer.from(pngData));
    }
    return pngBuffers;
  } finally {
    doc.destroy();
  }
}

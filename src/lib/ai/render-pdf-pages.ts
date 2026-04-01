import * as mupdf from "mupdf";

/**
 * Render a single PDF page to a PNG buffer using mupdf WASM.
 * @param pdfBuffer - Raw PDF file bytes
 * @param pageIndex - 0-based page index
 * @param dpi - Render resolution (default 150 — optimal for Claude Vision)
 * @returns PNG image as Buffer
 */
export async function renderPdfPage(
  pdfBuffer: Buffer,
  pageIndex: number,
  dpi: number = 150
): Promise<Buffer> {
  const doc = mupdf.Document.openDocument(pdfBuffer, "application/pdf");
  try {
    const page = doc.loadPage(pageIndex);
    const scale = dpi / 72; // PDF default is 72 DPI
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
 * @param pdfBuffer - Raw PDF file bytes
 * @param pageIndices - 0-based page indices to render
 * @param dpi - Render resolution (default 150)
 * @returns Array of PNG buffers in the same order as pageIndices
 */
export async function renderPages(
  pdfBuffer: Buffer,
  pageIndices: number[],
  dpi: number = 150
): Promise<Buffer[]> {
  const doc = mupdf.Document.openDocument(pdfBuffer, "application/pdf");
  const scale = dpi / 72;
  const matrix = mupdf.Matrix.scale(scale, scale);

  try {
    return pageIndices.map((pageIndex) => {
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
 * @param pdfBuffer - Raw PDF file bytes
 * @param dpi - Render resolution (default 150)
 * @returns Array of PNG buffers, one per page
 */
export async function renderAllPages(
  pdfBuffer: Buffer,
  dpi: number = 150
): Promise<Buffer[]> {
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

import * as mupdf from "mupdf";

export function renderPdfFirstPageAsPng(pdfBuffer: Buffer): Buffer {
  const doc = mupdf.Document.openDocument(pdfBuffer, "application/pdf");
  try {
    const page = doc.loadPage(0);
    const [, , w, h] = page.getBounds();

    // Scale to ~1200px wide for cover image
    const scale = 1200 / w;
    const matrix = mupdf.Matrix.scale(scale, scale);

    const pixmap = page.toPixmap(matrix, mupdf.ColorSpace.DeviceRGB, false);
    const pngData = pixmap.asPNG();

    return Buffer.from(pngData);
  } finally {
    doc.destroy();
  }
}

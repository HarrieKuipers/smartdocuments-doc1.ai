import anthropic, { MODELS } from "./client";
import { renderPages, renderPdfPage } from "./render-pdf-pages";

/** Claude Vision API limit: 5 MB per image */
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export interface VisualContent {
  pageIndex: number; // 0-based
  contentType: "table" | "chart" | "diagram" | "image-with-text";
  description: string;
  tableMarkdown?: string;
  dataPoints?: string;
}

/**
 * Maximum number of pages to scan for visual content detection.
 * For large documents, we sample evenly across the document.
 */
const MAX_DETECTION_PAGES = 80;

/**
 * Maximum number of visual pages to extract detailed content from.
 * Keeps costs and processing time bounded.
 */
const MAX_EXTRACT_PAGES = 30;

/**
 * Step 1: Detect which pages in a PDF contain visual content (tables, charts, diagrams).
 * For large documents (>MAX_DETECTION_PAGES), samples pages evenly across the document.
 * Sends page images to Claude in batches for efficient detection.
 * @param pdfBuffer - Raw PDF bytes
 * @param pageCount - Total number of pages
 * @returns Array of 0-based page indices that contain visual content
 */
export async function detectVisualPages(
  pdfBuffer: Buffer,
  pageCount: number
): Promise<number[]> {
  const visualPages: number[] = [];

  // Determine which pages to scan
  let pageIndicesToScan: number[];
  if (pageCount <= MAX_DETECTION_PAGES) {
    // Small doc: scan all pages
    pageIndicesToScan = Array.from({ length: pageCount }, (_, i) => i);
  } else {
    // Large doc: sample evenly across the document
    pageIndicesToScan = [];
    const step = pageCount / MAX_DETECTION_PAGES;
    for (let i = 0; i < MAX_DETECTION_PAGES; i++) {
      pageIndicesToScan.push(Math.floor(i * step));
    }
    // Deduplicate
    pageIndicesToScan = [...new Set(pageIndicesToScan)];
    console.log(
      `Large PDF (${pageCount} pages): sampling ${pageIndicesToScan.length} pages for visual detection`
    );
  }

  const BATCH_SIZE = 20; // Smaller batches = less memory, more reliable

  for (let i = 0; i < pageIndicesToScan.length; i += BATCH_SIZE) {
    const batchIndices = pageIndicesToScan.slice(i, i + BATCH_SIZE);

    let pngBuffers: Buffer[];
    try {
      pngBuffers = await renderPages(pdfBuffer, batchIndices, 72); // Low DPI for detection
    } catch (err) {
      console.warn(`Page rendering failed for batch starting at index ${batchIndices[0]}:`, err);
      continue;
    }

    // Build multi-image content for Claude
    const content: Array<
      | { type: "image"; source: { type: "base64"; media_type: "image/png"; data: string } }
      | { type: "text"; text: string }
    > = [];

    for (let j = 0; j < pngBuffers.length; j++) {
      // Skip images that exceed Claude's 5MB limit (unlikely at 72 DPI but safety check)
      if (pngBuffers[j].length > MAX_IMAGE_BYTES) {
        console.warn(`Detection: skipping page ${batchIndices[j] + 1} (${(pngBuffers[j].length / 1024 / 1024).toFixed(1)}MB exceeds 5MB limit)`);
        continue;
      }
      content.push({
        type: "image",
        source: {
          type: "base64",
          media_type: "image/png",
          data: pngBuffers[j].toString("base64"),
        },
      });
      content.push({
        type: "text",
        text: `Page ${batchIndices[j] + 1}`,
      });
    }

    content.push({
      type: "text",
      text: `Which of these pages contain tables, charts, graphs, diagrams, or images with important text? Return ONLY a JSON array of page numbers (1-based). If none, return [].`,
    });

    try {
      const response = await anthropic.messages.create({
        model: MODELS.chat,
        max_tokens: 256,
        messages: [{ role: "user", content }],
      });

      const text =
        response.content[0].type === "text" ? response.content[0].text : "";
      const match = text.match(/\[[\d,\s]*\]/);
      if (match) {
        const pages: number[] = JSON.parse(match[0]);
        // Convert 1-based to 0-based
        for (const p of pages) {
          if (p >= 1 && p <= pageCount) {
            visualPages.push(p - 1);
          }
        }
      }
    } catch (err) {
      console.warn(`Visual detection failed for batch at pages ${batchIndices[0] + 1}-${batchIndices[batchIndices.length - 1] + 1}:`, err);
    }
  }

  const unique = [...new Set(visualPages)].sort((a, b) => a - b);

  // Cap the number of visual pages to avoid excessive extraction costs
  if (unique.length > MAX_EXTRACT_PAGES) {
    console.log(
      `Capping visual pages from ${unique.length} to ${MAX_EXTRACT_PAGES} (evenly sampled)`
    );
    const step = unique.length / MAX_EXTRACT_PAGES;
    const sampled: number[] = [];
    for (let i = 0; i < MAX_EXTRACT_PAGES; i++) {
      sampled.push(unique[Math.floor(i * step)]);
    }
    return sampled;
  }

  return unique;
}

export interface VisualExtractionResult {
  content: VisualContent[];
  /** Map of 0-based page index → 150 DPI PNG buffer (for uploading to S3) */
  pageRenders: Map<number, Buffer>;
}

/**
 * Step 2: Extract detailed visual content from specific pages.
 * Sends individual high-res page images to Claude Vision for extraction.
 * Also returns the 150 DPI renders so they can be stored in S3 for display in chat.
 * @param pdfBuffer - Raw PDF bytes
 * @param pageIndices - 0-based page indices to extract from
 * @returns Visual content items + high-res page renders
 */
export async function extractVisualContent(
  pdfBuffer: Buffer,
  pageIndices: number[]
): Promise<VisualExtractionResult> {
  if (pageIndices.length === 0) return { content: [], pageRenders: new Map() };

  // Render visual pages at higher DPI for extraction
  const pngBuffers = await renderPages(pdfBuffer, pageIndices, 150);
  const results: VisualContent[] = [];

  // Re-render oversized images at lower DPI to stay under Claude's 5MB limit
  for (let i = 0; i < pngBuffers.length; i++) {
    if (pngBuffers[i].length > MAX_IMAGE_BYTES) {
      const pageIdx = pageIndices[i];
      console.log(
        `Page ${pageIdx + 1} image too large (${(pngBuffers[i].length / 1024 / 1024).toFixed(1)}MB), re-rendering at 100 DPI`
      );
      try {
        const smaller = await renderPdfPage(pdfBuffer, pageIdx, 100);
        if (smaller.length <= MAX_IMAGE_BYTES) {
          pngBuffers[i] = smaller;
        } else {
          // Still too large — try 72 DPI
          console.log(`Page ${pageIdx + 1} still too large at 100 DPI, trying 72 DPI`);
          const smallest = await renderPdfPage(pdfBuffer, pageIdx, 72);
          if (smallest.length <= MAX_IMAGE_BYTES) {
            pngBuffers[i] = smallest;
          } else {
            console.warn(`Page ${pageIdx + 1} exceeds 5MB even at 72 DPI (${(smallest.length / 1024 / 1024).toFixed(1)}MB), skipping`);
            pngBuffers[i] = Buffer.alloc(0); // Mark as skipped
          }
        }
      } catch (err) {
        console.warn(`Re-render failed for page ${pageIdx + 1}:`, err);
        pngBuffers[i] = Buffer.alloc(0);
      }
    }
  }

  // Process pages in parallel (max 3 concurrent to avoid rate limits)
  const CONCURRENCY = 3;
  for (let i = 0; i < pngBuffers.length; i += CONCURRENCY) {
    const batch = pngBuffers.slice(i, i + CONCURRENCY);
    const batchIndices = pageIndices.slice(i, i + CONCURRENCY);

    const batchResults = await Promise.all(
      batch.map(async (png, j) => {
        const pageIdx = batchIndices[j];
        // Skip pages that were too large even after re-rendering
        if (png.length === 0) return [];
        try {
          const response = await anthropic.messages.create({
            model: MODELS.chat,
            max_tokens: 1024,
            messages: [
              {
                role: "user",
                content: [
                  {
                    type: "image",
                    source: {
                      type: "base64",
                      media_type: "image/png",
                      data: png.toString("base64"),
                    },
                  },
                  {
                    type: "text",
                    text: `Extract ALL visual content from this page (page ${pageIdx + 1}):
1. Tables: Convert to markdown table format. Preserve all headers, merged cells, and exact numbers.
2. Charts/Graphs: Describe the type, axes, trends, and key data points. Include specific numbers where readable.
3. Diagrams: Describe the structure, relationships, and flow.
4. Images with text: Extract all readable text.

Return a JSON array of objects, each with:
{ "contentType": "table"|"chart"|"diagram"|"image-with-text", "description": "...", "tableMarkdown": "..." (if table), "dataPoints": "..." (if chart) }

If no visual content, return [].`,
                  },
                ],
              },
            ],
          });

          const text =
            response.content[0].type === "text"
              ? response.content[0].text
              : "";
          // Extract JSON from response
          const jsonMatch = text.match(/\[[\s\S]*?\]/);
          if (jsonMatch) {
            const items = JSON.parse(jsonMatch[0]) as Array<{
              contentType: string;
              description: string;
              tableMarkdown?: string;
              dataPoints?: string;
            }>;
            return items.map((item) => ({
              pageIndex: pageIdx,
              contentType: item.contentType as VisualContent["contentType"],
              description: item.description,
              tableMarkdown: item.tableMarkdown,
              dataPoints: item.dataPoints,
            }));
          }
          return [];
        } catch (err) {
          console.warn(`Visual extraction failed for page ${pageIdx + 1}:`, err);
          return [];
        }
      })
    );

    results.push(...batchResults.flat());
  }

  // Build map of page index → high-res render (skip empty buffers from failed renders)
  const pageRenders = new Map<number, Buffer>();
  for (let i = 0; i < pageIndices.length; i++) {
    if (pngBuffers[i].length > 0) {
      pageRenders.set(pageIndices[i], pngBuffers[i]);
    }
  }

  return { content: results, pageRenders };
}

import { getFileUrl } from "@/lib/storage";

/**
 * Build page image URLs for all physical pages.
 * pageNumber = display page (physical - offset), used for labels/badges.
 * url = always points to the physical page image in S3.
 *
 * @param documentId - MongoDB document ID
 * @param pageCount - Total physical pages
 * @param pageLabelOffset - Number of physical pages before printed "1" (default 0)
 */
export function buildPageImageUrls(
  documentId: string,
  pageCount: number,
  pageLabelOffset: number = 0
): { pageNumber: number; url: string }[] {
  const result: { pageNumber: number; url: string }[] = [];
  for (let physical = 1; physical <= pageCount; physical++) {
    result.push({
      pageNumber: physical - pageLabelOffset,
      url: getFileUrl(`documents/${documentId}/pages/page-${physical}.png`),
    });
  }
  return result;
}

/**
 * Build a map of display page number → S3 image URL.
 * Used in chat routes to look up page images by the (offset-adjusted) page number stored in chunks.
 */
export function buildPageImageMap(
  documentId: string,
  pageCount: number,
  pageLabelOffset: number = 0
): Map<number, string> {
  const map = new Map<number, string>();
  for (let physical = 1; physical <= pageCount; physical++) {
    map.set(physical - pageLabelOffset, getFileUrl(`documents/${documentId}/pages/page-${physical}.png`));
  }
  return map;
}

import { Client } from "@notionhq/client";
import type { BlockObjectRequest } from "@notionhq/client/build/src/api-endpoints";

export async function exportToNotion(
  apiKey: string,
  parentPageId: string,
  payload: Record<string, unknown>
): Promise<string> {
  const notion = new Client({ auth: apiKey });

  const title = (payload.title as string) || "Document";
  const summary =
    (payload.summary as string) ||
    (payload.content as Record<string, unknown>)?.summary?.toString() ||
    "";
  const keyPoints = (payload.keyPoints as { text: string }[]) || [];
  const findings =
    (payload.findings as { category: string; title: string; content: string }[]) ||
    [];

  const children: BlockObjectRequest[] = [];

  // Summary
  if (summary) {
    children.push({
      object: "block" as const,
      type: "heading_2" as const,
      heading_2: {
        rich_text: [{ type: "text" as const, text: { content: "Samenvatting" } }],
      },
    });
    children.push({
      object: "block" as const,
      type: "paragraph" as const,
      paragraph: {
        rich_text: [
          { type: "text" as const, text: { content: summary.slice(0, 2000) } },
        ],
      },
    });
  }

  // Key points
  if (keyPoints.length > 0) {
    children.push({
      object: "block" as const,
      type: "heading_2" as const,
      heading_2: {
        rich_text: [{ type: "text" as const, text: { content: "Hoofdpunten" } }],
      },
    });
    for (const point of keyPoints.slice(0, 20)) {
      children.push({
        object: "block" as const,
        type: "bulleted_list_item" as const,
        bulleted_list_item: {
          rich_text: [
            { type: "text" as const, text: { content: point.text.slice(0, 2000) } },
          ],
        },
      });
    }
  }

  // Findings
  if (findings.length > 0) {
    children.push({
      object: "block" as const,
      type: "heading_2" as const,
      heading_2: {
        rich_text: [
          { type: "text" as const, text: { content: "Belangrijke Bevindingen" } },
        ],
      },
    });
    for (const finding of findings.slice(0, 10)) {
      children.push({
        object: "block" as const,
        type: "heading_3" as const,
        heading_3: {
          rich_text: [
            {
              type: "text" as const,
              text: {
                content: `${finding.category}: ${finding.title}`.slice(0, 200),
              },
            },
          ],
        },
      });
      children.push({
        object: "block" as const,
        type: "paragraph" as const,
        paragraph: {
          rich_text: [
            {
              type: "text" as const,
              text: { content: finding.content.slice(0, 2000) },
            },
          ],
        },
      });
    }
  }

  const page = await notion.pages.create({
    parent: { page_id: parentPageId },
    properties: {
      title: {
        title: [{ text: { content: title } }],
      },
    },
    children: children.slice(0, 100), // Notion limit
  });

  return "url" in page ? page.url : page.id;
}

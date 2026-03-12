import connectDB from "@/lib/db";
import Template from "@/models/Template";
import { getTemplate, TEMPLATES, type TemplateId, type TemplateConfig } from "./templates";

/** Async version — reads from DB with static fallback (use in server components / API routes). */
export async function getTemplateAsync(
  id: TemplateId | string | undefined
): Promise<TemplateConfig> {
  if (!id) return getTemplate(id);

  try {
    await connectDB();
    const doc = await Template.findOne({ templateId: id }).lean();
    if (doc) {
      return {
        id: (id in TEMPLATES ? id : "doc1") as TemplateId,
        name: doc.name,
        primary: doc.primary,
        primaryDark: doc.primaryDark,
        primaryLight: doc.primaryLight,
        logo: doc.logo,
        logoPosition: doc.logoPosition,
        headerStyle: doc.headerStyle,
        showB1Button: doc.showB1Button,
        showInfoBox: doc.showInfoBox,
        infoBoxLabel: doc.infoBoxLabel ?? "",
        showChatWidget: doc.showChatWidget,
        showTableOfContents: doc.showTableOfContents,
        footerText: doc.footerText,
        footerLink: doc.footerLink,
      };
    }
  } catch {
    // DB unavailable — fall through to static
  }
  return getTemplate(id);
}

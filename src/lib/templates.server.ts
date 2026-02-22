import connectDB from "@/lib/db";
import Template from "@/models/Template";
import { getTemplate, TEMPLATES, type TemplateId, type TemplateConfig } from "./templates";

/** Async version — reads from DB with static fallback (use in server components / API routes). */
export async function getTemplateAsync(
  id: TemplateId | string | undefined
): Promise<TemplateConfig> {
  const fallback = getTemplate(id);
  if (!id || !(id in TEMPLATES)) return fallback;

  try {
    await connectDB();
    const doc = await Template.findOne({ templateId: id }).lean();
    if (doc) {
      return {
        id: id as TemplateId,
        name: doc.name,
        primary: doc.primary,
        primaryDark: doc.primaryDark,
        primaryLight: doc.primaryLight,
        logo: doc.logo,
        headerStyle: doc.headerStyle,
        showB1Button: doc.showB1Button,
        showInfoBox: doc.showInfoBox,
        infoBoxLabel: doc.infoBoxLabel ?? "",
      };
    }
  } catch {
    // DB unavailable — fall through to static
  }
  return fallback;
}

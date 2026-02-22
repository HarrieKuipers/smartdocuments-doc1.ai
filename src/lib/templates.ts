export const TEMPLATE_IDS = ["doc1", "rijksoverheid", "amsterdam"] as const;
export type TemplateId = (typeof TEMPLATE_IDS)[number];

export interface TemplateConfig {
  id: TemplateId;
  name: string;
  primary: string;
  primaryDark: string;
  primaryLight: string;
  logo?: string;
  headerStyle: "default" | "split-bar" | "inline-logo";
  showB1Button: boolean;
  showInfoBox: boolean;
  infoBoxLabel: string;
}

export const TEMPLATES: Record<TemplateId, TemplateConfig> = {
  doc1: {
    id: "doc1",
    name: "Doc1",
    primary: "#0062EB",
    primaryDark: "#0050C0",
    primaryLight: "#E0F0FF",
    headerStyle: "default",
    showB1Button: false,
    showInfoBox: false,
    infoBoxLabel: "",
  },
  rijksoverheid: {
    id: "rijksoverheid",
    name: "Rijksoverheid",
    primary: "#154273",
    primaryDark: "#0c2840",
    primaryLight: "#d6e4f0",
    logo: "/templates/logo_rijksoverheid.png",
    headerStyle: "split-bar",
    showB1Button: true,
    showInfoBox: true,
    infoBoxLabel: "Meer informatie",
  },
  amsterdam: {
    id: "amsterdam",
    name: "Amsterdam",
    primary: "#EC0000",
    primaryDark: "#c40000",
    primaryLight: "#ffe6e6",
    logo: "/templates/logo_amsterdam.svg",
    headerStyle: "inline-logo",
    showB1Button: false,
    showInfoBox: true,
    infoBoxLabel: "Meer informatie",
  },
};

/** Sync fallback — returns static defaults (use in client components). */
export function getTemplate(id: TemplateId | string | undefined): TemplateConfig {
  if (id && id in TEMPLATES) return TEMPLATES[id as TemplateId];
  return TEMPLATES.doc1;
}

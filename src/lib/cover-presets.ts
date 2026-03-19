import type { ICoverDesign } from "@/components/documents/cover-builder/types";

export interface CoverPreset {
  id: string;
  name: string;
  description: string;
  factory: (title: string, brandPrimary: string) => ICoverDesign;
}

export const COVER_PRESETS: CoverPreset[] = [
  {
    id: "clean-white",
    name: "Schoon wit",
    description: "Wit, donkere tekst, gecentreerd",
    factory: (title) => ({
      background: { type: "solid", color: "#ffffff" },
      title: {
        text: title,
        fontFamily: "inter",
        fontSize: 48,
        fontWeight: 700,
        color: "#111827",
        align: "center",
      },
      layout: "centered",
      showLogo: false,
      showOrgName: false,
      showDocBranding: true,
      showTags: false,
      orientation: "landscape",
      presetId: "clean-white",
    }),
  },
  {
    id: "corporate-blue",
    name: "Zakelijk blauw",
    description: "Blauw gradient, witte tekst",
    factory: (title) => ({
      background: {
        type: "gradient",
        gradientFrom: "#1e3a5f",
        gradientTo: "#0062EB",
        gradientDirection: "to-bottom-right",
      },
      title: {
        text: title,
        fontFamily: "inter",
        fontSize: 48,
        fontWeight: 700,
        color: "#ffffff",
        align: "left",
      },
      subtitle: {
        text: "",
        fontFamily: "inter",
        fontSize: 24,
        fontWeight: 400,
        color: "rgba(255,255,255,0.8)",
        align: "left",
      },
      layout: "bottom-left",
      showLogo: true,
      showOrgName: false,
      showDocBranding: true,
      showTags: false,
      orientation: "landscape",
      presetId: "corporate-blue",
    }),
  },
  {
    id: "dark-modern",
    name: "Donker modern",
    description: "Donkere achtergrond, witte tekst",
    factory: (title) => ({
      background: {
        type: "gradient",
        gradientFrom: "#0f172a",
        gradientTo: "#1e293b",
        gradientDirection: "to-bottom",
      },
      title: {
        text: title,
        fontFamily: "inter",
        fontSize: 48,
        fontWeight: 700,
        color: "#f8fafc",
        align: "center",
      },
      layout: "centered",
      showLogo: false,
      showOrgName: false,
      showDocBranding: true,
      showTags: true,
      orientation: "landscape",
      presetId: "dark-modern",
    }),
  },
  {
    id: "brand-primary",
    name: "Huisstijlkleur",
    description: "Organisatiekleur als gradient",
    factory: (title, brandPrimary) => ({
      background: {
        type: "gradient",
        gradientFrom: brandPrimary,
        gradientTo: adjustBrightness(brandPrimary, -30),
        gradientDirection: "to-bottom-right",
      },
      title: {
        text: title,
        fontFamily: "inter",
        fontSize: 48,
        fontWeight: 700,
        color: "#ffffff",
        align: "left",
      },
      layout: "bottom-left",
      showLogo: true,
      showOrgName: false,
      showDocBranding: false,
      showTags: false,
      orientation: "landscape",
      presetId: "brand-primary",
    }),
  },
];

function adjustBrightness(hex: string, amount: number): string {
  const num = parseInt(hex.replace("#", ""), 16);
  const r = Math.max(0, Math.min(255, ((num >> 16) & 255) + amount));
  const g = Math.max(0, Math.min(255, ((num >> 8) & 255) + amount));
  const b = Math.max(0, Math.min(255, (num & 255) + amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

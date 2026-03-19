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
      showOrgName: true,
      showDocBranding: true,
      showTags: false,
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
      showOrgName: true,
      showDocBranding: true,
      showTags: false,
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
      showOrgName: true,
      showDocBranding: true,
      showTags: true,
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
      showOrgName: true,
      showDocBranding: false,
      showTags: false,
      presetId: "brand-primary",
    }),
  },
  {
    id: "minimal-accent",
    name: "Minimaal accent",
    description: "Wit met kleur-accentbalk",
    factory: (title, brandPrimary) => ({
      background: { type: "solid", color: "#fafafa" },
      title: {
        text: title,
        fontFamily: "inter",
        fontSize: 44,
        fontWeight: 600,
        color: "#111827",
        align: "left",
      },
      subtitle: {
        text: "",
        fontFamily: "inter",
        fontSize: 20,
        fontWeight: 400,
        color: brandPrimary,
        align: "left",
      },
      layout: "top-left",
      showLogo: true,
      showOrgName: true,
      showDocBranding: true,
      showTags: true,
      presetId: "minimal-accent",
    }),
  },
  {
    id: "elegant-serif",
    name: "Elegant serif",
    description: "Warm, Georgia font, gecentreerd",
    factory: (title) => ({
      background: {
        type: "gradient",
        gradientFrom: "#fef3c7",
        gradientTo: "#fffbeb",
        gradientDirection: "to-bottom",
      },
      title: {
        text: title,
        fontFamily: "georgia",
        fontSize: 44,
        fontWeight: 700,
        color: "#78350f",
        align: "center",
      },
      layout: "centered",
      showLogo: false,
      showOrgName: true,
      showDocBranding: true,
      showTags: false,
      presetId: "elegant-serif",
    }),
  },
  {
    id: "split-color",
    name: "Gesplitst",
    description: "Links kleur, rechts wit",
    factory: (title, brandPrimary) => ({
      background: {
        type: "gradient",
        gradientFrom: brandPrimary,
        gradientTo: "#ffffff",
        gradientDirection: "to-right",
      },
      title: {
        text: title,
        fontFamily: "inter",
        fontSize: 44,
        fontWeight: 700,
        color: "#ffffff",
        align: "left",
      },
      layout: "split-left",
      showLogo: true,
      showOrgName: true,
      showDocBranding: false,
      showTags: false,
      presetId: "split-color",
    }),
  },
  {
    id: "org-branded",
    name: "Organisatie",
    description: "Organisatiekleur, logo, naam",
    factory: (title, brandPrimary) => ({
      background: { type: "solid", color: brandPrimary },
      title: {
        text: title,
        fontFamily: "inter",
        fontSize: 48,
        fontWeight: 700,
        color: "#ffffff",
        align: "center",
      },
      layout: "centered",
      showLogo: true,
      showOrgName: true,
      showDocBranding: false,
      showTags: true,
      presetId: "org-branded",
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

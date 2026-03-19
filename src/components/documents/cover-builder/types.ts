export type FontFamily = "inter" | "georgia" | "roboto-mono";
export type FontWeight = 400 | 500 | 600 | 700;
export type TextAlign = "left" | "center" | "right";
export type GradientDirection = "to-bottom" | "to-right" | "to-bottom-right";
export type CoverLayout = "centered" | "bottom-left" | "top-left" | "split-left";

export interface ICoverTextElement {
  text: string;
  fontFamily: FontFamily;
  fontSize: number;
  fontWeight: FontWeight;
  color: string;
  align: TextAlign;
}

export type CoverOrientation = "landscape" | "portrait";

export interface ICoverDesign {
  orientation: CoverOrientation;
  background: {
    type: "solid" | "gradient" | "image";
    color?: string;
    gradientFrom?: string;
    gradientTo?: string;
    gradientDirection?: GradientDirection;
    imageUrl?: string;
    imageOverlayOpacity?: number;
  };
  title: ICoverTextElement;
  subtitle?: ICoverTextElement;
  layout: CoverLayout;
  showLogo: boolean;
  showOrgName: boolean;
  showDocBranding: boolean;
  showTags: boolean;
  presetId?: string;
}

export const FONT_OPTIONS: { value: FontFamily; label: string }[] = [
  { value: "inter", label: "Inter" },
  { value: "georgia", label: "Georgia" },
  { value: "roboto-mono", label: "Roboto Mono" },
];

export const FONT_WEIGHT_OPTIONS: { value: FontWeight; label: string }[] = [
  { value: 400, label: "Normaal" },
  { value: 500, label: "Medium" },
  { value: 600, label: "Semibold" },
  { value: 700, label: "Vet" },
];

export const LAYOUT_OPTIONS: { value: CoverLayout; label: string; description: string }[] = [
  { value: "centered", label: "Gecentreerd", description: "Tekst in het midden" },
  { value: "bottom-left", label: "Linksonder", description: "Tekst linksonder" },
  { value: "top-left", label: "Linksboven", description: "Tekst linksboven" },
];

export function getDefaultCoverDesign(title: string): ICoverDesign {
  return {
    orientation: "landscape",
    background: {
      type: "solid",
      color: "#ffffff",
    },
    title: {
      text: title,
      fontFamily: "inter",
      fontSize: 48,
      fontWeight: 700,
      color: "#111827",
      align: "left",
    },
    layout: "centered",
    showLogo: false,
    showOrgName: true,
    showDocBranding: true,
    showTags: false,
  };
}

export function getFontFamilyCSS(font: FontFamily): string {
  switch (font) {
    case "inter":
      return "'Inter', sans-serif";
    case "georgia":
      return "'Georgia', serif";
    case "roboto-mono":
      return "'Roboto Mono', monospace";
  }
}

export function getGradientCSS(
  from: string,
  to: string,
  direction: GradientDirection = "to-bottom"
): string {
  const dir =
    direction === "to-bottom"
      ? "to bottom"
      : direction === "to-right"
        ? "to right"
        : "to bottom right";
  return `linear-gradient(${dir}, ${from}, ${to})`;
}

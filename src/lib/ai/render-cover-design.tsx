import { ImageResponse } from "next/og";
import type { ICoverDesign } from "@/components/documents/cover-builder/types";

interface RenderOptions {
  design: ICoverDesign;
  orgName: string;
  orgLogo?: string;
  tags: string[];
  brandPrimary: string;
}

export async function renderCoverFromDesign({
  design,
  orgName,
  orgLogo,
  tags,
  brandPrimary,
}: RenderOptions): Promise<Buffer> {
  const bg = design.background;

  // Background styles
  let backgroundStyle: Record<string, string> = {};
  if (bg.type === "solid") {
    backgroundStyle = { backgroundColor: bg.color || "#ffffff" };
  } else if (bg.type === "gradient") {
    const dir =
      bg.gradientDirection === "to-right"
        ? "to right"
        : bg.gradientDirection === "to-bottom-right"
          ? "to bottom right"
          : "to bottom";
    backgroundStyle = {
      background: `linear-gradient(${dir}, ${bg.gradientFrom || "#000"}, ${bg.gradientTo || "#333"})`,
    };
  } else if (bg.type === "image" && bg.imageUrl) {
    backgroundStyle = {
      backgroundImage: `url(${bg.imageUrl})`,
      backgroundSize: "cover",
      backgroundPosition: "center",
    };
  }

  // Layout flex styles
  const layoutStyles = getLayoutStyles(design.layout);

  // Font family mapping
  const fontFamily = getFontCSS(design.title.fontFamily);
  const subtitleFontFamily = design.subtitle
    ? getFontCSS(design.subtitle.fontFamily)
    : fontFamily;

  const isLight = isLightColor(design.title.color);

  const response = new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          ...backgroundStyle,
        }}
      >
        {/* Image overlay */}
        {bg.type === "image" && (bg.imageOverlayOpacity ?? 0) > 0 && (
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: `rgba(0, 0, 0, ${(bg.imageOverlayOpacity || 0) / 100})`,
            }}
          />
        )}

        {/* Split layout accent */}
        {design.layout === "split-left" && (
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              bottom: 0,
              width: "50%",
              backgroundColor: bg.type === "solid" ? (bg.color || brandPrimary) : brandPrimary,
            }}
          />
        )}

        {/* Content */}
        <div
          style={{
            position: "relative",
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            padding: 60,
            ...layoutStyles,
          }}
        >
          {/* Org logo */}
          {design.showLogo && orgLogo && (
            <div style={{ display: "flex", alignItems: "center" }}>
              <img
                src={orgLogo}
                width={40}
                height={40}
                style={{ borderRadius: 8, objectFit: "contain" }}
              />
            </div>
          )}

          {/* Top spacer — pushes content down for bottom-left, centered, split-left */}
          {(design.layout === "bottom-left" || design.layout === "centered" || design.layout === "split-left") && (
            <div style={{ display: "flex", flex: 1 }} />
          )}

          {/* Title + subtitle */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 16,
              maxWidth: design.layout === "split-left" ? "45%" : "90%",
            }}
          >
            <div
              style={{
                fontSize: design.title.fontSize,
                fontWeight: design.title.fontWeight,
                fontFamily,
                color: design.title.color,
                textAlign: design.title.align,
                lineHeight: 1.2,
                wordBreak: "break-word",
              }}
            >
              {(design.title.text || "Titel").slice(0, 200)}
            </div>

            {design.subtitle?.text && (
              <div
                style={{
                  fontSize: design.subtitle.fontSize,
                  fontWeight: design.subtitle.fontWeight,
                  fontFamily: subtitleFontFamily,
                  color: design.subtitle.color,
                  textAlign: design.subtitle.align,
                  lineHeight: 1.4,
                }}
              >
                {design.subtitle.text.slice(0, 200)}
              </div>
            )}

            {/* Tags */}
            {design.showTags && tags.length > 0 && (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                {tags.slice(0, 4).map((tag) => (
                  <span
                    key={tag}
                    style={{
                      padding: "6px 16px",
                      borderRadius: 20,
                      backgroundColor: `${brandPrimary}22`,
                      color: isLight ? "rgba(255,255,255,0.9)" : brandPrimary,
                      fontSize: 14,
                      fontWeight: 500,
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Bottom spacer — pushes branding down for centered and top-left */}
          {(design.layout === "centered" || design.layout === "top-left") && (
            <div style={{ display: "flex", flex: 1 }} />
          )}

        </div>
      </div>
    ),
    {
      width: design.orientation === "portrait" ? 630 : 1200,
      height: design.orientation === "portrait" ? 891 : 630,
    }
  );

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

function getLayoutStyles(
  layout: ICoverDesign["layout"]
): Record<string, string> {
  switch (layout) {
    case "centered":
      return { alignItems: "center" };
    case "bottom-left":
    case "top-left":
    case "split-left":
      return { alignItems: "flex-start" };
  }
}

function getFontCSS(font: string): string {
  switch (font) {
    case "georgia":
      return "Georgia, serif";
    case "roboto-mono":
      return "'Roboto Mono', monospace";
    default:
      return "'Inter', sans-serif";
  }
}

function isLightColor(color: string): boolean {
  if (!color) return false;
  const hex = color.replace("#", "");
  if (hex.length !== 6) return false;
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 180;
}

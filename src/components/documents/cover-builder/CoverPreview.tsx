"use client";

import { useRef, useEffect, useState } from "react";
import type { ICoverDesign } from "./types";
import { getFontFamilyCSS, getGradientCSS } from "./types";

interface CoverPreviewProps {
  design: ICoverDesign;
  orgName?: string;
  orgLogo?: string;
  tags?: string[];
  brandPrimary?: string;
}

const COVER_W = 1200;
const COVER_H = 630;

export default function CoverPreview({
  design,
  orgName = "Organisatie",
  orgLogo,
  tags = [],
  brandPrimary = "#0062EB",
}: CoverPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);

  useEffect(() => {
    function updateScale() {
      if (!containerRef.current) return;
      const w = containerRef.current.offsetWidth;
      setScale(w / COVER_W);
    }
    updateScale();
    const observer = new ResizeObserver(updateScale);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const bg = design.background;
  const backgroundStyle: React.CSSProperties = {};
  if (bg.type === "solid") {
    backgroundStyle.backgroundColor = bg.color || "#ffffff";
  } else if (bg.type === "gradient") {
    backgroundStyle.background = getGradientCSS(
      bg.gradientFrom || "#000000",
      bg.gradientTo || "#333333",
      bg.gradientDirection
    );
  } else if (bg.type === "image") {
    backgroundStyle.backgroundImage = bg.imageUrl ? `url(${bg.imageUrl})` : undefined;
    backgroundStyle.backgroundSize = "cover";
    backgroundStyle.backgroundPosition = "center";
  }

  // Layout positioning
  const layoutStyles = getLayoutStyles(design.layout);

  return (
    <div
      ref={containerRef}
      className="w-full overflow-hidden rounded-lg border bg-gray-100"
      style={{ aspectRatio: `${COVER_W} / ${COVER_H}` }}
    >
      <div
        style={{
          width: COVER_W,
          height: COVER_H,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          position: "relative",
          ...backgroundStyle,
        }}
      >
        {/* Image overlay */}
        {bg.type === "image" && (bg.imageOverlayOpacity ?? 0) > 0 && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundColor: `rgba(0, 0, 0, ${(bg.imageOverlayOpacity || 0) / 100})`,
            }}
          />
        )}

        {/* Split layout accent panel */}
        {design.layout === "split-left" && (
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              bottom: 0,
              width: "50%",
              backgroundColor: bg.type === "solid" ? (bg.color || brandPrimary) : undefined,
              background:
                bg.type === "gradient"
                  ? getGradientCSS(
                      bg.gradientFrom || brandPrimary,
                      bg.gradientTo || "#ffffff",
                      "to-bottom"
                    )
                  : undefined,
            }}
          />
        )}

        {/* Content wrapper */}
        <div
          style={{
            position: "relative",
            zIndex: 1,
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            padding: 60,
            ...layoutStyles,
          }}
        >
          {/* Top: org branding */}
          {design.showOrgName && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                ...(design.layout === "centered" ? {} : {}),
              }}
            >
              {design.showLogo && orgLogo && (
                <img
                  src={orgLogo}
                  alt=""
                  style={{ width: 40, height: 40, borderRadius: 8, objectFit: "contain" }}
                />
              )}
              {design.showLogo && !orgLogo && (
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 8,
                    backgroundColor: brandPrimary,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "white",
                    fontSize: 18,
                    fontWeight: 700,
                  }}
                >
                  {orgName[0]?.toUpperCase() || "D"}
                </div>
              )}
              <span
                style={{
                  fontSize: 18,
                  color: isLightText(design.title.color) ? "rgba(255,255,255,0.7)" : "#6b7280",
                  fontWeight: 500,
                }}
              >
                {orgName}
              </span>
            </div>
          )}

          {/* Spacer */}
          <div style={{ flex: 1 }} />

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
                fontFamily: getFontFamilyCSS(design.title.fontFamily),
                color: design.title.color,
                textAlign: design.title.align,
                lineHeight: 1.2,
                wordBreak: "break-word",
              }}
            >
              {design.title.text || "Titel"}
            </div>

            {design.subtitle?.text && (
              <div
                style={{
                  fontSize: design.subtitle.fontSize,
                  fontWeight: design.subtitle.fontWeight,
                  fontFamily: getFontFamilyCSS(design.subtitle.fontFamily),
                  color: design.subtitle.color,
                  textAlign: design.subtitle.align,
                  lineHeight: 1.4,
                }}
              >
                {design.subtitle.text}
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
                      color: isLightText(design.title.color) ? "rgba(255,255,255,0.9)" : brandPrimary,
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

          {/* Bottom spacer for centered layout */}
          {design.layout === "centered" && <div style={{ flex: 1 }} />}

          {/* Bottom: branding */}
          {design.showDocBranding && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginTop: design.layout === "centered" ? 0 : 40,
              }}
            >
              <div
                style={{
                  width: 80,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: brandPrimary,
                }}
              />
              <span
                style={{
                  fontSize: 14,
                  color: isLightText(design.title.color) ? "rgba(255,255,255,0.5)" : "#9ca3af",
                }}
              >
                doc1.ai
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function getLayoutStyles(layout: ICoverDesign["layout"]): React.CSSProperties {
  switch (layout) {
    case "centered":
      return { justifyContent: "center", alignItems: "center" };
    case "bottom-left":
      return { justifyContent: "flex-end", alignItems: "flex-start" };
    case "top-left":
      return { justifyContent: "flex-start", alignItems: "flex-start" };
    case "split-left":
      return { justifyContent: "center", alignItems: "flex-start" };
  }
}

function isLightText(color: string): boolean {
  if (!color) return false;
  const hex = color.replace("#", "");
  if (hex.length !== 6) return color.includes("255") || color.toLowerCase().includes("white");
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 180;
}

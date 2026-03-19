"use client";

import { COVER_PRESETS } from "@/lib/cover-presets";
import type { ICoverDesign } from "./types";
import { getGradientCSS } from "./types";

interface CoverPresetPickerProps {
  currentPresetId?: string;
  title: string;
  brandPrimary: string;
  onSelect: (design: ICoverDesign) => void;
}

export default function CoverPresetPicker({
  currentPresetId,
  title,
  brandPrimary,
  onSelect,
}: CoverPresetPickerProps) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {COVER_PRESETS.map((preset) => {
        const design = preset.factory(title, brandPrimary);
        const isActive = currentPresetId === preset.id;
        const bg = design.background;

        let bgStyle: React.CSSProperties = {};
        if (bg.type === "solid") {
          bgStyle.backgroundColor = bg.color || "#ffffff";
        } else if (bg.type === "gradient") {
          bgStyle.background = getGradientCSS(
            bg.gradientFrom || "#000000",
            bg.gradientTo || "#333333",
            bg.gradientDirection
          );
        }

        return (
          <button
            key={preset.id}
            type="button"
            onClick={() => onSelect(design)}
            className={`group flex flex-col items-center gap-1.5 rounded-lg border p-2 transition-all ${
              isActive
                ? "border-primary ring-2 ring-primary/20"
                : "hover:border-gray-400"
            }`}
          >
            {/* Mini preview */}
            <div
              className="w-full rounded border"
              style={{
                aspectRatio: "1200 / 630",
                ...bgStyle,
              }}
            >
              <div
                className="flex h-full items-center justify-center p-2"
                style={{
                  fontSize: 7,
                  fontWeight: design.title.fontWeight,
                  color: design.title.color,
                  textAlign: design.title.align as "left" | "center" | "right",
                  lineHeight: 1.2,
                  overflow: "hidden",
                }}
              >
                {title.length > 30 ? title.slice(0, 30) + "..." : title}
              </div>
            </div>
            <span className="text-[10px] font-medium text-muted-foreground group-hover:text-foreground">
              {preset.name}
            </span>
          </button>
        );
      })}
    </div>
  );
}

"use client";

import { useRef, useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Image as ImageIcon,
  Loader2,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import type {
  ICoverDesign,
  ICoverTextElement,
  FontFamily,
  FontWeight,
  TextAlign,
  GradientDirection,
  CoverLayout,
} from "./types";
import {
  FONT_OPTIONS,
  FONT_WEIGHT_OPTIONS,
  LAYOUT_OPTIONS,
} from "./types";
import CoverPresetPicker from "./CoverPresetPicker";

interface CoverControlsProps {
  design: ICoverDesign;
  onChange: (design: ICoverDesign) => void;
  documentId: string;
  title: string;
  brandPrimary: string;
}

export default function CoverControls({
  design,
  onChange,
  documentId,
  title,
  brandPrimary,
}: CoverControlsProps) {
  const bgImageRef = useRef<HTMLInputElement>(null);
  const [uploadingBg, setUploadingBg] = useState(false);

  function update(partial: Partial<ICoverDesign>) {
    onChange({ ...design, ...partial });
  }

  function updateBackground(partial: Partial<ICoverDesign["background"]>) {
    update({ background: { ...design.background, ...partial } });
  }

  function updateTitle(partial: Partial<ICoverTextElement>) {
    update({ title: { ...design.title, ...partial } });
  }

  function updateSubtitle(partial: Partial<ICoverTextElement>) {
    if (design.subtitle) {
      update({ subtitle: { ...design.subtitle, ...partial } });
    }
  }

  function addSubtitle() {
    update({
      subtitle: {
        text: "",
        fontFamily: "inter",
        fontSize: 24,
        fontWeight: 400,
        color: design.title.color,
        align: design.title.align,
      },
    });
  }

  function removeSubtitle() {
    update({ subtitle: undefined });
  }

  async function handleBgImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingBg(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`/api/documents/${documentId}/cover-design/background-image`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const { error } = await res.json();
        toast.error(error || "Upload mislukt.");
        return;
      }
      const { data } = await res.json();
      updateBackground({ type: "image", imageUrl: data.imageUrl });
      toast.success("Achtergrondafbeelding geüpload!");
    } catch {
      toast.error("Kon afbeelding niet uploaden.");
    } finally {
      setUploadingBg(false);
      if (bgImageRef.current) bgImageRef.current.value = "";
    }
  }

  return (
    <div className="space-y-5 overflow-y-auto pr-1" style={{ maxHeight: "calc(100vh - 280px)" }}>
      {/* Presets */}
      <Section title="Sjabloon">
        <CoverPresetPicker
          currentPresetId={design.presetId}
          title={title}
          brandPrimary={brandPrimary}
          onSelect={(d) => onChange({ ...d, presetId: d.presetId })}
        />
      </Section>

      <Separator />

      {/* Background */}
      <Section title="Achtergrond">
        <div className="space-y-3">
          <div className="flex gap-1.5">
            {(["solid", "gradient", "image"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => updateBackground({ type: t })}
                className={`flex-1 rounded-md border px-2 py-1.5 text-xs font-medium transition-all ${
                  design.background.type === t
                    ? "border-primary bg-primary/5 text-primary"
                    : "hover:border-gray-400"
                }`}
              >
                {t === "solid" ? "Kleur" : t === "gradient" ? "Gradient" : "Afbeelding"}
              </button>
            ))}
          </div>

          {design.background.type === "solid" && (
            <ColorField
              label="Achtergrondkleur"
              value={design.background.color || "#ffffff"}
              onChange={(color) => updateBackground({ color })}
            />
          )}

          {design.background.type === "gradient" && (
            <>
              <ColorField
                label="Van"
                value={design.background.gradientFrom || "#000000"}
                onChange={(gradientFrom) => updateBackground({ gradientFrom })}
              />
              <ColorField
                label="Naar"
                value={design.background.gradientTo || "#333333"}
                onChange={(gradientTo) => updateBackground({ gradientTo })}
              />
              <div className="space-y-1">
                <Label className="text-xs">Richting</Label>
                <Select
                  value={design.background.gradientDirection || "to-bottom"}
                  onValueChange={(v) => updateBackground({ gradientDirection: v as GradientDirection })}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="to-bottom">Naar beneden</SelectItem>
                    <SelectItem value="to-right">Naar rechts</SelectItem>
                    <SelectItem value="to-bottom-right">Diagonaal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {design.background.type === "image" && (
            <>
              <input
                ref={bgImageRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleBgImageUpload}
                className="hidden"
              />
              {design.background.imageUrl ? (
                <div className="space-y-2">
                  <div className="relative overflow-hidden rounded border">
                    <img
                      src={design.background.imageUrl}
                      alt="Achtergrond"
                      className="h-20 w-full object-cover"
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs"
                    onClick={() => bgImageRef.current?.click()}
                    disabled={uploadingBg}
                  >
                    {uploadingBg ? (
                      <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                    ) : (
                      <Upload className="mr-1 h-3 w-3" />
                    )}
                    Vervangen
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  className="w-full text-xs"
                  onClick={() => bgImageRef.current?.click()}
                  disabled={uploadingBg}
                >
                  {uploadingBg ? (
                    <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <ImageIcon className="mr-1 h-3.5 w-3.5" />
                  )}
                  Afbeelding uploaden
                </Button>
              )}
              <div className="space-y-1">
                <Label className="text-xs">Overlay donkerte ({design.background.imageOverlayOpacity || 0}%)</Label>
                <input
                  type="range"
                  min={0}
                  max={80}
                  value={design.background.imageOverlayOpacity || 0}
                  onChange={(e) =>
                    updateBackground({ imageOverlayOpacity: parseInt(e.target.value) })
                  }
                  className="w-full accent-primary"
                />
              </div>
            </>
          )}
        </div>
      </Section>

      <Separator />

      {/* Title */}
      <Section title="Titel">
        <TextElementControls
          element={design.title}
          onChange={updateTitle}
          minFontSize={24}
          maxFontSize={72}
        />
      </Section>

      <Separator />

      {/* Subtitle */}
      <Section title="Ondertitel">
        {design.subtitle ? (
          <div className="space-y-3">
            <TextElementControls
              element={design.subtitle}
              onChange={updateSubtitle}
              minFontSize={14}
              maxFontSize={48}
            />
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground hover:text-red-500"
              onClick={removeSubtitle}
            >
              <Trash2 className="mr-1 h-3 w-3" />
              Ondertitel verwijderen
            </Button>
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs"
            onClick={addSubtitle}
          >
            <Plus className="mr-1 h-3 w-3" />
            Ondertitel toevoegen
          </Button>
        )}
      </Section>

      <Separator />

      {/* Layout */}
      <Section title="Indeling">
        <div className="grid grid-cols-2 gap-2">
          {LAYOUT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => update({ layout: opt.value })}
              className={`rounded-lg border p-2.5 text-left transition-all ${
                design.layout === opt.value
                  ? "border-primary ring-2 ring-primary/20"
                  : "hover:border-gray-400"
              }`}
            >
              <div className="text-xs font-medium">{opt.label}</div>
              <div className="text-[10px] text-muted-foreground">{opt.description}</div>
            </button>
          ))}
        </div>
      </Section>

    </div>
  );
}

// -- Helpers --

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2.5">
      <Label className="text-xs font-semibold text-foreground">{title}</Label>
      {children}
    </div>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <Label className="w-20 text-xs text-muted-foreground">{label}</Label>
      <div className="relative flex items-center gap-1.5">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-7 w-7 cursor-pointer rounded border p-0.5"
        />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-7 w-24 font-mono text-xs"
        />
      </div>
    </div>
  );
}

function TextElementControls({
  element,
  onChange,
  minFontSize,
  maxFontSize,
}: {
  element: ICoverTextElement;
  onChange: (partial: Partial<ICoverTextElement>) => void;
  minFontSize: number;
  maxFontSize: number;
}) {
  return (
    <div className="space-y-3">
      <Textarea
        value={element.text}
        onChange={(e) => onChange({ text: e.target.value })}
        placeholder="Tekst..."
        rows={2}
        className="resize-none text-sm"
      />
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs">Font</Label>
          <Select
            value={element.fontFamily}
            onValueChange={(v) => onChange({ fontFamily: v as FontFamily })}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FONT_OPTIONS.map((f) => (
                <SelectItem key={f.value} value={f.value}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Gewicht</Label>
          <Select
            value={String(element.fontWeight)}
            onValueChange={(v) => onChange({ fontWeight: parseInt(v) as FontWeight })}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FONT_WEIGHT_OPTIONS.map((w) => (
                <SelectItem key={w.value} value={String(w.value)}>
                  {w.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Grootte ({element.fontSize}px)</Label>
        <input
          type="range"
          min={minFontSize}
          max={maxFontSize}
          value={element.fontSize}
          onChange={(e) => onChange({ fontSize: parseInt(e.target.value) })}
          className="w-full accent-primary"
        />
      </div>
      <div className="flex items-center justify-between">
        <ColorField
          label="Kleur"
          value={element.color}
          onChange={(color) => onChange({ color })}
        />
        <div className="flex gap-0.5">
          {(["left", "center", "right"] as const).map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => onChange({ align: a })}
              className={`rounded p-1.5 ${
                element.align === a
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-gray-100"
              }`}
            >
              {a === "left" ? (
                <AlignLeft className="h-3.5 w-3.5" />
              ) : a === "center" ? (
                <AlignCenter className="h-3.5 w-3.5" />
              ) : (
                <AlignRight className="h-3.5 w-3.5" />
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function ToggleOption({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
          checked ? "bg-primary" : "bg-gray-200"
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-3 w-3 rounded-full bg-white shadow-sm transition-transform ${
            checked ? "translate-x-3" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}

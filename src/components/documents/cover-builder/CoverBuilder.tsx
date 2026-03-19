"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Check,
  ImageIcon,
  Loader2,
  Monitor,
  Paintbrush,
  Save,
  Smartphone,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";
import type { ICoverDesign } from "./types";
import { getDefaultCoverDesign } from "./types";
import CoverPreview from "./CoverPreview";
import CoverControls from "./CoverControls";

type CoverMode = "design" | "upload";

interface CoverBuilderProps {
  documentId: string;
  title: string;
  tags: string[];
  orgName: string;
  orgLogo?: string;
  brandPrimary: string;
  initialDesign?: ICoverDesign;
  coverImageUrl?: string;
  customCoverUrl?: string;
  onCoverSaved?: (customCoverUrl: string) => void;
  onCoverUploaded?: (customCoverUrl: string) => void;
  onCoverRemoved?: () => void;
}

export default function CoverBuilder({
  documentId,
  title,
  tags,
  orgName,
  orgLogo,
  brandPrimary,
  initialDesign,
  coverImageUrl,
  customCoverUrl,
  onCoverSaved,
  onCoverUploaded,
  onCoverRemoved,
}: CoverBuilderProps) {
  // Determine initial mode: if there's a saved design, show designer; if only an uploaded cover, show upload
  const [mode, setMode] = useState<CoverMode>(
    initialDesign ? "design" : customCoverUrl && !initialDesign ? "upload" : "design"
  );
  const [design, setDesign] = useState<ICoverDesign>(
    initialDesign || getDefaultCoverDesign(title)
  );
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  // Cover image upload
  const [coverUploading, setCoverUploading] = useState(false);
  const coverInputRef = useRef<HTMLInputElement | null>(null);

  // Sync title from document when it changes externally
  useEffect(() => {
    if (!initialDesign && design.title.text === "") {
      setDesign((prev) => ({
        ...prev,
        title: { ...prev.title, text: title },
      }));
    }
  }, [title, initialDesign, design.title.text]);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/documents/${documentId}/cover-design`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coverDesign: design }),
      });
      if (!res.ok) {
        const { error } = await res.json();
        toast.error(error || "Opslaan mislukt.");
        return;
      }
      const { data } = await res.json();
      toast.success("Voorblad opgeslagen!");
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2000);
      onCoverSaved?.(data.customCoverUrl);
    } catch {
      toast.error("Kon voorblad niet opslaan.");
    } finally {
      setSaving(false);
    }
  }

  async function handleCoverUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCoverUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`/api/documents/${documentId}/cover`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const { error } = await res.json();
        toast.error(error || "Upload mislukt.");
        return;
      }
      const { data } = await res.json();
      toast.success("Coverafbeelding geüpload!");
      onCoverUploaded?.(data.customCoverUrl);
    } catch {
      toast.error("Kon coverafbeelding niet uploaden.");
    } finally {
      setCoverUploading(false);
      if (coverInputRef.current) coverInputRef.current.value = "";
    }
  }

  async function handleCoverRemove() {
    setCoverUploading(true);
    try {
      const res = await fetch(`/api/documents/${documentId}/cover`, { method: "DELETE" });
      if (!res.ok) {
        toast.error("Kon coverafbeelding niet verwijderen.");
        return;
      }
      toast.success("Cover verwijderd.");
      onCoverRemoved?.();
    } catch {
      toast.error("Kon coverafbeelding niet verwijderen.");
    } finally {
      setCoverUploading(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl py-6">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Voorblad</h3>
          <p className="text-[10px] text-muted-foreground">
            Ontwerp een voorblad of upload een eigen afbeelding.
          </p>
        </div>
        {mode === "design" && (
          <Button
            onClick={handleSave}
            disabled={saving}
            size="sm"
            className="gap-1.5"
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : justSaved ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            {saving ? "Opslaan..." : justSaved ? "Opgeslagen" : "Voorblad opslaan"}
          </Button>
        )}
      </div>

      {/* Mode toggle */}
      <div className="mb-6 flex items-center gap-1 rounded-lg border bg-white p-1 w-fit">
        <button
          type="button"
          onClick={() => setMode("design")}
          className={`flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium transition-all ${
            mode === "design"
              ? "bg-primary text-white"
              : "text-muted-foreground hover:bg-gray-100"
          }`}
        >
          <Paintbrush className="h-4 w-4" />
          Ontwerpen
        </button>
        <button
          type="button"
          onClick={() => setMode("upload")}
          className={`flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium transition-all ${
            mode === "upload"
              ? "bg-primary text-white"
              : "text-muted-foreground hover:bg-gray-100"
          }`}
        >
          <ImageIcon className="h-4 w-4" />
          Afbeelding uploaden
        </button>
      </div>

      {/* Design mode */}
      {mode === "design" && (
        <div className="grid grid-cols-5 gap-6">
          {/* Preview (3 cols) */}
          <div className="col-span-3 space-y-4">
            {/* Orientation toggle */}
            <div className="flex items-center gap-1 rounded-lg border bg-white p-1 w-fit">
              <button
                type="button"
                onClick={() => setDesign((prev) => ({ ...prev, orientation: "landscape" }))}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                  (design.orientation || "landscape") === "landscape"
                    ? "bg-gray-900 text-white"
                    : "text-muted-foreground hover:bg-gray-100"
                }`}
              >
                <Monitor className="h-3.5 w-3.5" />
                Liggend
              </button>
              <button
                type="button"
                onClick={() => setDesign((prev) => ({ ...prev, orientation: "portrait" }))}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                  design.orientation === "portrait"
                    ? "bg-gray-900 text-white"
                    : "text-muted-foreground hover:bg-gray-100"
                }`}
              >
                <Smartphone className="h-3.5 w-3.5" />
                Staand
              </button>
            </div>

            {/* Preview card */}
            <Card>
              <CardContent className="p-4">
                <CoverPreview
                  design={design}
                  orgName={orgName}
                  orgLogo={orgLogo}
                  tags={tags}
                  brandPrimary={brandPrimary}
                />
              </CardContent>
            </Card>
          </div>

          {/* Controls (2 cols) */}
          <div className="col-span-2">
            <Card>
              <CardContent className="p-4">
                <CoverControls
                  design={design}
                  onChange={setDesign}
                  documentId={documentId}
                  title={title}
                  brandPrimary={brandPrimary}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Upload mode */}
      {mode === "upload" && (
        <Card className="max-w-2xl">
          <CardContent className="p-6">
            <div className="space-y-4">
              {/* Current cover preview */}
              {(customCoverUrl || coverImageUrl) ? (
                <div className="overflow-hidden rounded-lg border bg-gray-50">
                  <img
                    src={customCoverUrl || coverImageUrl}
                    alt="Cover"
                    className="w-full h-auto max-h-[400px] object-contain"
                  />
                </div>
              ) : (
                <div
                  className="flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
                  style={{ aspectRatio: "1200 / 630" }}
                  onClick={() => coverInputRef.current?.click()}
                >
                  <ImageIcon className="h-10 w-10 text-muted-foreground/40" />
                  <div className="text-center">
                    <p className="text-sm font-medium text-muted-foreground">
                      Klik om een afbeelding te uploaden
                    </p>
                    <p className="text-xs text-muted-foreground/60">
                      JPG, PNG of WebP (max 5MB)
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2">
                <input
                  ref={coverInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleCoverUpload}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => coverInputRef.current?.click()}
                  disabled={coverUploading}
                >
                  {coverUploading ? (
                    <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Upload className="mr-1 h-3.5 w-3.5" />
                  )}
                  {customCoverUrl ? "Cover vervangen" : "Afbeelding uploaden"}
                </Button>
                {customCoverUrl && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCoverRemove}
                    disabled={coverUploading}
                    className="text-muted-foreground hover:text-red-500"
                  >
                    <X className="mr-1 h-3.5 w-3.5" />
                    Verwijderen
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

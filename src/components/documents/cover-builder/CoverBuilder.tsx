"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Check, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import type { ICoverDesign } from "./types";
import { getDefaultCoverDesign } from "./types";
import CoverPreview from "./CoverPreview";
import CoverControls from "./CoverControls";

interface CoverBuilderProps {
  documentId: string;
  title: string;
  tags: string[];
  orgName: string;
  orgLogo?: string;
  brandPrimary: string;
  initialDesign?: ICoverDesign;
  onCoverSaved?: (customCoverUrl: string) => void;
}

export default function CoverBuilder({
  documentId,
  title,
  tags,
  orgName,
  orgLogo,
  brandPrimary,
  initialDesign,
  onCoverSaved,
}: CoverBuilderProps) {
  const [design, setDesign] = useState<ICoverDesign>(
    initialDesign || getDefaultCoverDesign(title)
  );
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

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

  return (
    <div className="mx-auto max-w-6xl py-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Voorblad ontwerpen</h3>
          <p className="text-[10px] text-muted-foreground">
            Ontwerp een voorblad voor je document. Kies een sjabloon of maak je eigen ontwerp.
          </p>
        </div>
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
      </div>

      <div className="grid grid-cols-5 gap-6">
        {/* Preview (3 cols) */}
        <div className="col-span-3">
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
    </div>
  );
}

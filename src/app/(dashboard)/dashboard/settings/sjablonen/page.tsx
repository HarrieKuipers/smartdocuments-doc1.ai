"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BookOpen,
  Info,
  Layout,
  Loader2,
  Palette,
  Pencil,
  Plus,
  ShieldCheck,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

interface TemplateData {
  _id: string;
  templateId: string;
  name: string;
  primary: string;
  primaryDark: string;
  primaryLight: string;
  logo?: string;
  headerStyle: "default" | "split-bar" | "inline-logo";
  showB1Button: boolean;
  showInfoBox: boolean;
  infoBoxLabel: string;
  isSystem: boolean;
}

const EMPTY_TEMPLATE: Omit<TemplateData, "_id" | "templateId" | "isSystem"> = {
  name: "",
  primary: "#0062EB",
  primaryDark: "#0050C0",
  primaryLight: "#E0F0FF",
  headerStyle: "default",
  showB1Button: false,
  showInfoBox: false,
  infoBoxLabel: "",
};

export default function SjablonenPage() {
  const [templates, setTemplates] = useState<TemplateData[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TemplateData | null>(null);
  const [formData, setFormData] = useState(EMPTY_TEMPLATE);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Delete confirmation
  const [deleteTemplate, setDeleteTemplate] = useState<TemplateData | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const res = await fetch("/api/templates");
      if (res.ok) {
        const { data } = await res.json();
        setTemplates(data);
      }
    } catch {
      toast.error("Kon sjablonen niet laden.");
    } finally {
      setLoading(false);
    }
  };

  const openCreateDialog = () => {
    setEditingTemplate(null);
    setFormData({ ...EMPTY_TEMPLATE });
    setDialogOpen(true);
  };

  const openEditDialog = (t: TemplateData) => {
    setEditingTemplate(t);
    setFormData({
      name: t.name,
      primary: t.primary,
      primaryDark: t.primaryDark,
      primaryLight: t.primaryLight,
      logo: t.logo,
      headerStyle: t.headerStyle,
      showB1Button: t.showB1Button,
      showInfoBox: t.showInfoBox,
      infoBoxLabel: t.infoBoxLabel,
    });
    setDialogOpen(true);
  };

  const handleLogoUpload = useCallback(
    async (file: File) => {
      if (!editingTemplate) return;
      setUploadingLogo(true);
      try {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch(
          `/api/templates/${editingTemplate.templateId}/logo`,
          { method: "POST", body: fd }
        );
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Upload mislukt");
        }
        const { logo } = await res.json();
        setFormData((prev) => ({ ...prev, logo }));
        toast.success("Logo geüpload");
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Logo uploaden mislukt"
        );
      } finally {
        setUploadingLogo(false);
        if (logoInputRef.current) logoInputRef.current.value = "";
      }
    },
    [editingTemplate]
  );

  const handleDeleteLogo = useCallback(async () => {
    if (!editingTemplate) return;
    setUploadingLogo(true);
    try {
      const res = await fetch(
        `/api/templates/${editingTemplate.templateId}/logo`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error();
      setFormData((prev) => ({ ...prev, logo: undefined }));
      toast.success("Logo verwijderd");
    } catch {
      toast.error("Logo verwijderen mislukt");
    } finally {
      setUploadingLogo(false);
    }
  }, [editingTemplate]);

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error("Vul een naam in.");
      return;
    }
    if (!formData.primary || !formData.primaryDark || !formData.primaryLight) {
      toast.error("Vul alle kleuren in.");
      return;
    }

    setSaving(true);
    try {
      if (editingTemplate) {
        const res = await fetch(`/api/templates/${editingTemplate.templateId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
        if (!res.ok) throw new Error();
        toast.success("Sjabloon bijgewerkt!");
      } else {
        const res = await fetch("/api/templates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
        if (!res.ok) throw new Error();
        toast.success("Sjabloon aangemaakt!");
      }

      setDialogOpen(false);
      await loadTemplates();
    } catch {
      toast.error("Kon sjabloon niet opslaan.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTemplate) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/templates/${deleteTemplate.templateId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      toast.success("Sjabloon verwijderd!");
      setDeleteTemplate(null);
      await loadTemplates();
    } catch {
      toast.error("Kon sjabloon niet verwijderen.");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <Palette className="size-5" />
            Sjablonen
          </h1>
          <p className="text-sm text-muted-foreground">
            Beheer de sjablonen voor je documenten.
          </p>
        </div>

        <Button onClick={openCreateDialog}>
          <Plus className="size-4 mr-1.5" />
          Nieuw sjabloon
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {templates.map((t) => (
          <Card
            key={t.templateId}
            className="group cursor-pointer rounded-2xl border-gray-100 overflow-hidden transition-shadow hover:shadow-md"
            onClick={() => openEditDialog(t)}
          >
            {/* Preview header */}
            <div
              className="relative h-24 flex items-end p-4"
              style={{ backgroundColor: t.primary }}
            >
              <div className="flex items-center gap-3">
                {t.logo && (
                  <img
                    src={t.logo}
                    alt={t.name}
                    className="h-8 rounded bg-white/20 p-1"
                  />
                )}
                <span className="text-lg font-bold text-white">{t.name}</span>
              </div>
              {t.isSystem && (
                <div className="absolute top-3 right-3">
                  <Badge className="bg-white/20 text-white border-0 text-[10px]">
                    <ShieldCheck className="mr-1 h-3 w-3" />
                    Systeem
                  </Badge>
                </div>
              )}
              <div className={`absolute ${t.isSystem ? "top-3 right-20" : "top-3 right-3"} rounded-full bg-white/20 p-1.5 opacity-0 transition-opacity group-hover:opacity-100`}>
                <Pencil className="h-3.5 w-3.5 text-white" />
              </div>
            </div>

            <CardContent className="p-5 space-y-4">
              {/* Colors */}
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400 mb-2">
                  Kleuren
                </p>
                <div className="flex gap-2">
                  {[
                    { label: "Primary", color: t.primary },
                    { label: "Dark", color: t.primaryDark },
                    { label: "Light", color: t.primaryLight },
                  ].map((c) => (
                    <div key={c.label} className="flex items-center gap-2">
                      <span
                        className="h-6 w-6 rounded-lg border border-gray-200"
                        style={{ backgroundColor: c.color }}
                      />
                      <span className="text-xs text-gray-500">{c.color}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Features */}
              <div className="flex flex-wrap gap-2">
                <Badge className="bg-gray-100 text-gray-600">
                  <Layout className="mr-1 h-3 w-3" />
                  {t.headerStyle}
                </Badge>
                {t.showB1Button && (
                  <Badge className="bg-emerald-100 text-emerald-700">
                    <BookOpen className="mr-1 h-3 w-3" />
                    B1 Button
                  </Badge>
                )}
                {t.showInfoBox && (
                  <Badge className="bg-blue-100 text-blue-700">
                    <Info className="mr-1 h-3 w-3" />
                    Info Box
                  </Badge>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    openEditDialog(t);
                  }}
                >
                  <Pencil className="size-3.5 mr-1" />
                  Bewerken
                </Button>
                {!t.isSystem && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteTemplate(t);
                    }}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="size-3.5 mr-1" />
                    Verwijderen
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? `Sjabloon bewerken — ${editingTemplate.name}` : "Nieuw sjabloon"}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            {/* Preview */}
            <div
              className="h-16 flex items-end rounded-lg p-3"
              style={{ backgroundColor: formData.primary }}
            >
              <span className="text-sm font-bold text-white">
                {formData.name || "Preview"}
              </span>
            </div>

            {/* Name */}
            <div className="space-y-1.5">
              <Label>Naam</Label>
              <Input
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Bijv. Mijn organisatie"
              />
            </div>

            {/* Colors */}
            <div className="grid grid-cols-3 gap-3">
              {(
                [
                  ["primary", "Primary"],
                  ["primaryDark", "Dark"],
                  ["primaryLight", "Light"],
                ] as const
              ).map(([key, label]) => (
                <div key={key} className="space-y-1.5">
                  <Label>{label}</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={formData[key]}
                      onChange={(e) =>
                        setFormData({ ...formData, [key]: e.target.value })
                      }
                      className="h-9 w-9 cursor-pointer rounded border border-gray-200 p-0.5"
                    />
                    <Input
                      value={formData[key]}
                      onChange={(e) =>
                        setFormData({ ...formData, [key]: e.target.value })
                      }
                      className="font-mono text-xs"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Logo - only for existing templates */}
            {editingTemplate && (
              <div className="space-y-1.5">
                <Label>Logo</Label>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/svg+xml,image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleLogoUpload(file);
                  }}
                />
                {formData.logo ? (
                  <div className="flex items-center gap-3 rounded-lg border border-gray-200 p-3">
                    <img
                      src={formData.logo}
                      alt="Logo"
                      className="h-10 max-w-[120px] object-contain"
                    />
                    <span className="flex-1 truncate text-xs text-gray-500">
                      {formData.logo.split("/").pop()}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-gray-400 hover:text-red-500"
                      onClick={handleDeleteLogo}
                      disabled={uploadingLogo}
                    >
                      {uploadingLogo ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => logoInputRef.current?.click()}
                    disabled={uploadingLogo}
                  >
                    {uploadingLogo ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="mr-2 h-4 w-4" />
                    )}
                    Logo uploaden
                  </Button>
                )}
                <p className="text-[11px] text-muted-foreground">
                  SVG, PNG, JPG of WebP. Maximaal 2MB.
                </p>
              </div>
            )}

            {/* Header style */}
            <div className="space-y-1.5">
              <Label>Header stijl</Label>
              <Select
                value={formData.headerStyle}
                onValueChange={(v) =>
                  setFormData({
                    ...formData,
                    headerStyle: v as TemplateData["headerStyle"],
                  })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Standaard header</SelectItem>
                  <SelectItem value="split-bar">Logo + titelbalk</SelectItem>
                  <SelectItem value="inline-logo">Logo + titel inline</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Info box label */}
            <div className="space-y-1.5">
              <Label>Info box label</Label>
              <Input
                value={formData.infoBoxLabel}
                onChange={(e) =>
                  setFormData({ ...formData, infoBoxLabel: e.target.value })
                }
                placeholder="Meer informatie"
              />
            </div>

            {/* Toggles */}
            <div className="flex gap-6">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={formData.showB1Button}
                  onCheckedChange={(v) =>
                    setFormData({ ...formData, showB1Button: !!v })
                  }
                />
                B1 Button
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={formData.showInfoBox}
                  onCheckedChange={(v) =>
                    setFormData({ ...formData, showInfoBox: !!v })
                  }
                />
                Info Box
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={saving}
            >
              Annuleren
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingTemplate ? "Opslaan" : "Aanmaken"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog
        open={!!deleteTemplate}
        onOpenChange={() => setDeleteTemplate(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Sjabloon verwijderen?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Weet je zeker dat je &quot;{deleteTemplate?.name}&quot; wilt
            verwijderen? Dit kan niet ongedaan worden gemaakt.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteTemplate(null)}
              disabled={deleting}
            >
              Annuleren
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting && <Loader2 className="size-4 mr-1.5 animate-spin" />}
              Verwijderen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

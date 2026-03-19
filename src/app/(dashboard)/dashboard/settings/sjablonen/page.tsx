"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
  List,
  Loader2,
  MessageSquare,
  Palette,
  Pencil,
  Plus,
  Settings,
  ShieldCheck,
  Trash2,
  Type,
  Upload,
  Image as ImageIcon,
} from "lucide-react";
import { toast } from "sonner";

interface TemplateData {
  _id: string;
  templateId: string;
  name: string;
  primary: string;
  primaryDark: string;
  primaryLight: string;
  accentColor?: string;
  backgroundColor?: string;
  logo?: string;
  favicon?: string;
  fontHeading?: string;
  fontBody?: string;
  headerStyle: "default" | "split-bar" | "inline-logo";
  cornerRadius?: "none" | "small" | "medium" | "large";
  showB1Button: boolean;
  showInfoBox: boolean;
  infoBoxLabel: string;
  showChatWidget?: boolean;
  showTableOfContents?: boolean;
  footerText?: string;
  footerLink?: string;
  isSystem: boolean;
}

type FormData = Omit<TemplateData, "_id" | "templateId" | "isSystem">;

const EMPTY_TEMPLATE: FormData = {
  name: "",
  primary: "#0062EB",
  primaryDark: "#0050C0",
  primaryLight: "#E0F0FF",
  accentColor: "",
  backgroundColor: "#FFFFFF",
  headerStyle: "default",
  cornerRadius: "medium",
  fontHeading: "",
  fontBody: "",
  showB1Button: false,
  showInfoBox: false,
  infoBoxLabel: "",
  showChatWidget: true,
  showTableOfContents: true,
  footerText: "",
  footerLink: "",
};

const FONT_OPTIONS = [
  { value: "", label: "Standaard (System)" },
  { value: "Inter", label: "Inter" },
  { value: "DM Sans", label: "DM Sans" },
  { value: "Poppins", label: "Poppins" },
  { value: "Roboto", label: "Roboto" },
  { value: "Open Sans", label: "Open Sans" },
  { value: "Lato", label: "Lato" },
  { value: "Montserrat", label: "Montserrat" },
  { value: "Playfair Display", label: "Playfair Display" },
  { value: "Merriweather", label: "Merriweather" },
  { value: "Source Sans 3", label: "Source Sans 3" },
  { value: "IBM Plex Sans", label: "IBM Plex Sans" },
];

const RADIUS_OPTIONS = [
  { value: "none", label: "Geen", preview: "rounded-none" },
  { value: "small", label: "Klein", preview: "rounded" },
  { value: "medium", label: "Medium", preview: "rounded-lg" },
  { value: "large", label: "Groot", preview: "rounded-2xl" },
];

export default function SjablonenPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<TemplateData[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TemplateData | null>(null);
  const [formData, setFormData] = useState<FormData>(EMPTY_TEMPLATE);
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
      accentColor: t.accentColor || "",
      backgroundColor: t.backgroundColor || "#FFFFFF",
      logo: t.logo,
      favicon: t.favicon,
      fontHeading: t.fontHeading || "",
      fontBody: t.fontBody || "",
      headerStyle: t.headerStyle,
      cornerRadius: t.cornerRadius || "medium",
      showB1Button: t.showB1Button,
      showInfoBox: t.showInfoBox,
      infoBoxLabel: t.infoBoxLabel,
      showChatWidget: t.showChatWidget ?? true,
      showTableOfContents: t.showTableOfContents ?? true,
      footerText: t.footerText || "",
      footerLink: t.footerLink || "",
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

  const updateForm = (updates: Partial<FormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  };

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
            onClick={() => router.push(`/dashboard/settings/sjablonen/${t.templateId}`)}
          >
            {/* Color bar */}
            <div
              className="relative h-3"
              style={{ backgroundColor: t.primary }}
            >
              {t.isSystem && (
                <div className="absolute -bottom-3 right-3">
                  <Badge className="bg-gray-100 text-gray-500 border-0 text-[10px] shadow-sm">
                    <ShieldCheck className="mr-1 h-3 w-3" />
                    Systeem
                  </Badge>
                </div>
              )}
            </div>

            <CardContent className="p-5 space-y-4">
              {/* Logo + name */}
              <div className="flex items-center gap-3 min-h-[48px]">
                {t.logo ? (
                  <img
                    src={t.logo}
                    alt={t.name}
                    className="h-10 max-w-[120px] shrink-0 object-contain"
                  />
                ) : (
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                    style={{ backgroundColor: t.primaryLight }}
                  >
                    <Palette className="h-5 w-5" style={{ color: t.primary }} />
                  </div>
                )}
                <span className="text-base font-semibold text-gray-900 truncate">{t.name}</span>
              </div>

              {/* Colors */}
              <div className="flex gap-1.5">
                {[t.primary, t.primaryDark, t.primaryLight].map((color, i) => (
                  <span
                    key={i}
                    className="h-5 w-5 rounded-md border border-gray-200"
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-1 border-t border-gray-100">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/dashboard/settings/sjablonen/${t.templateId}`);
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
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? `Sjabloon bewerken — ${editingTemplate.name}` : "Nieuw sjabloon"}
            </DialogTitle>
          </DialogHeader>

          {/* Live preview */}
          <div
            className="relative h-20 flex items-end rounded-lg p-4 overflow-hidden"
            style={{ backgroundColor: formData.primary }}
          >
            {formData.logo && (
              <img src={formData.logo} alt="" className="h-7 rounded bg-white/20 p-0.5 mr-3" />
            )}
            <span className="text-base font-bold text-white" style={{ fontFamily: formData.fontHeading || undefined }}>
              {formData.name || "Voorbeeld"}
            </span>
            {formData.accentColor && (
              <div className="absolute top-0 right-0 h-full w-2" style={{ backgroundColor: formData.accentColor }} />
            )}
          </div>

          <Tabs defaultValue="branding" className="w-full">
            <TabsList variant="line" className="w-full justify-start">
              <TabsTrigger value="branding" className="gap-1.5 text-xs">
                <ImageIcon className="h-3.5 w-3.5" />
                Branding
              </TabsTrigger>
              <TabsTrigger value="colors" className="gap-1.5 text-xs">
                <Palette className="h-3.5 w-3.5" />
                Kleuren
              </TabsTrigger>
              <TabsTrigger value="typography" className="gap-1.5 text-xs">
                <Type className="h-3.5 w-3.5" />
                Typografie
              </TabsTrigger>
              <TabsTrigger value="layout" className="gap-1.5 text-xs">
                <Layout className="h-3.5 w-3.5" />
                Layout
              </TabsTrigger>
              <TabsTrigger value="features" className="gap-1.5 text-xs">
                <Settings className="h-3.5 w-3.5" />
                Functies
              </TabsTrigger>
            </TabsList>

            {/* Branding Tab */}
            <TabsContent value="branding" className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label>Sjabloonnaam</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => updateForm({ name: e.target.value })}
                  placeholder="Bijv. Mijn organisatie"
                />
              </div>

              {/* Logo */}
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
                      size="sm"
                      onClick={() => logoInputRef.current?.click()}
                      disabled={uploadingLogo}
                    >
                      Wijzigen
                    </Button>
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
                    onClick={() => {
                      if (editingTemplate) {
                        logoInputRef.current?.click();
                      } else {
                        toast.info("Sla het sjabloon eerst op, dan kun je een logo uploaden.");
                      }
                    }}
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
                  SVG, PNG, JPG of WebP. Maximaal 2MB. Aanbevolen: transparante achtergrond.
                </p>
              </div>

              <Separator />

              <div className="space-y-1.5">
                <Label>Footer tekst</Label>
                <Input
                  value={formData.footerText || ""}
                  onChange={(e) => updateForm({ footerText: e.target.value })}
                  placeholder="Bijv. © 2026 Mijn organisatie"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Footer link</Label>
                <Input
                  value={formData.footerLink || ""}
                  onChange={(e) => updateForm({ footerLink: e.target.value })}
                  placeholder="https://mijnorganisatie.nl"
                />
              </div>
            </TabsContent>

            {/* Colors Tab */}
            <TabsContent value="colors" className="space-y-4 pt-2">
              <div className="grid grid-cols-3 gap-3">
                {(
                  [
                    ["primary", "Primair"],
                    ["primaryDark", "Donker"],
                    ["primaryLight", "Licht"],
                  ] as const
                ).map(([key, label]) => (
                  <div key={key} className="space-y-1.5">
                    <Label>{label}</Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={formData[key]}
                        onChange={(e) => updateForm({ [key]: e.target.value })}
                        className="h-9 w-9 cursor-pointer rounded border border-gray-200 p-0.5"
                      />
                      <Input
                        value={formData[key]}
                        onChange={(e) => updateForm({ [key]: e.target.value })}
                        className="font-mono text-xs"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Accentkleur</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={formData.accentColor || "#FF6B00"}
                      onChange={(e) => updateForm({ accentColor: e.target.value })}
                      className="h-9 w-9 cursor-pointer rounded border border-gray-200 p-0.5"
                    />
                    <Input
                      value={formData.accentColor || ""}
                      onChange={(e) => updateForm({ accentColor: e.target.value })}
                      placeholder="Optioneel"
                      className="font-mono text-xs"
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Wordt gebruikt voor highlights en knoppen
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label>Achtergrondkleur</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={formData.backgroundColor || "#FFFFFF"}
                      onChange={(e) => updateForm({ backgroundColor: e.target.value })}
                      className="h-9 w-9 cursor-pointer rounded border border-gray-200 p-0.5"
                    />
                    <Input
                      value={formData.backgroundColor || ""}
                      onChange={(e) => updateForm({ backgroundColor: e.target.value })}
                      placeholder="#FFFFFF"
                      className="font-mono text-xs"
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Achtergrond van de pagina
                  </p>
                </div>
              </div>

              {/* Color preview */}
              <div className="rounded-lg border p-4 space-y-2">
                <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400">Voorbeeld</p>
                <div className="flex gap-3">
                  {[
                    { color: formData.primary, label: "Primair" },
                    { color: formData.primaryDark, label: "Donker" },
                    { color: formData.primaryLight, label: "Licht" },
                    ...(formData.accentColor ? [{ color: formData.accentColor, label: "Accent" }] : []),
                  ].map((c) => (
                    <div key={c.label} className="flex flex-col items-center gap-1">
                      <span
                        className="h-10 w-10 rounded-lg border border-gray-200"
                        style={{ backgroundColor: c.color }}
                      />
                      <span className="text-[10px] text-gray-400">{c.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* Typography Tab */}
            <TabsContent value="typography" className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label>Lettertype koppen</Label>
                <Select
                  value={formData.fontHeading || "system"}
                  onValueChange={(v) => updateForm({ fontHeading: v === "system" ? "" : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Standaard (System)" />
                  </SelectTrigger>
                  <SelectContent>
                    {FONT_OPTIONS.map((f) => (
                      <SelectItem key={f.value || "system"} value={f.value || "system"}>
                        <span style={{ fontFamily: f.value || undefined }}>{f.label}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground">
                  Wordt gebruikt voor titels, koppen en navigatie
                </p>
              </div>

              <div className="space-y-1.5">
                <Label>Lettertype tekst</Label>
                <Select
                  value={formData.fontBody || "system"}
                  onValueChange={(v) => updateForm({ fontBody: v === "system" ? "" : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Standaard (System)" />
                  </SelectTrigger>
                  <SelectContent>
                    {FONT_OPTIONS.map((f) => (
                      <SelectItem key={f.value || "system"} value={f.value || "system"}>
                        <span style={{ fontFamily: f.value || undefined }}>{f.label}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground">
                  Wordt gebruikt voor lopende tekst en beschrijvingen
                </p>
              </div>

              {/* Typography preview */}
              <div className="rounded-lg border p-4 space-y-3" style={{ backgroundColor: formData.backgroundColor || "#fff" }}>
                <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400">Voorbeeld</p>
                <h3
                  className="text-lg font-bold"
                  style={{ fontFamily: formData.fontHeading || undefined, color: formData.primary }}
                >
                  Dit is een voorbeeldkop
                </h3>
                <p
                  className="text-sm text-gray-600 leading-relaxed"
                  style={{ fontFamily: formData.fontBody || undefined }}
                >
                  Dit is een voorbeeld van lopende tekst. Zo ziet het document er uit voor de lezer met de gekozen lettertypes en kleuren.
                </p>
              </div>
            </TabsContent>

            {/* Layout Tab */}
            <TabsContent value="layout" className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label>Header stijl</Label>
                <Select
                  value={formData.headerStyle}
                  onValueChange={(v) => updateForm({ headerStyle: v as TemplateData["headerStyle"] })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">
                      <div className="flex items-center gap-2">
                        <Layout className="h-3.5 w-3.5" /> Standaard header
                      </div>
                    </SelectItem>
                    <SelectItem value="split-bar">
                      <div className="flex items-center gap-2">
                        <Layout className="h-3.5 w-3.5" /> Logo + titelbalk
                      </div>
                    </SelectItem>
                    <SelectItem value="inline-logo">
                      <div className="flex items-center gap-2">
                        <Layout className="h-3.5 w-3.5" /> Logo + titel inline
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground">
                  Bepaalt hoe de header en het logo worden weergegeven bovenaan het document
                </p>
              </div>

              <div className="space-y-1.5">
                <Label>Hoekafronding</Label>
                <div className="grid grid-cols-4 gap-2">
                  {RADIUS_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => updateForm({ cornerRadius: opt.value as FormData["cornerRadius"] })}
                      className={`flex flex-col items-center gap-2 rounded-lg border p-3 text-xs transition-all ${
                        formData.cornerRadius === opt.value
                          ? "border-primary ring-2 ring-primary/20"
                          : "hover:border-gray-400"
                      }`}
                    >
                      <div
                        className={`h-8 w-12 border-2 ${opt.preview}`}
                        style={{ borderColor: formData.primary }}
                      />
                      <span>{opt.label}</span>
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Afronding van kaarten, knoppen en secties
                </p>
              </div>

              {/* Header style preview */}
              <div className="rounded-lg border overflow-hidden">
                <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400 p-3 pb-2">Voorbeeld header</p>
                {formData.headerStyle === "default" && (
                  <div className="h-16 flex items-center px-6" style={{ backgroundColor: formData.primary }}>
                    <span className="text-sm font-bold text-white" style={{ fontFamily: formData.fontHeading || undefined }}>
                      {formData.name || "Document titel"}
                    </span>
                  </div>
                )}
                {formData.headerStyle === "split-bar" && (
                  <div className="flex h-16">
                    <div className="flex items-center justify-center px-4 bg-white border-r" style={{ minWidth: 80 }}>
                      {formData.logo ? (
                        <img src={formData.logo} alt="" className="h-8 object-contain" />
                      ) : (
                        <div className="h-8 w-8 rounded bg-gray-200" />
                      )}
                    </div>
                    <div className="flex-1 flex items-center px-4" style={{ backgroundColor: formData.primary }}>
                      <span className="text-sm font-bold text-white" style={{ fontFamily: formData.fontHeading || undefined }}>
                        {formData.name || "Document titel"}
                      </span>
                    </div>
                  </div>
                )}
                {formData.headerStyle === "inline-logo" && (
                  <div className="h-16 flex items-center gap-4 px-6" style={{ backgroundColor: formData.primary }}>
                    {formData.logo ? (
                      <img src={formData.logo} alt="" className="h-8 object-contain bg-white/20 p-1 rounded" />
                    ) : (
                      <div className="h-8 w-8 rounded bg-white/20" />
                    )}
                    <span className="text-sm font-bold text-white" style={{ fontFamily: formData.fontHeading || undefined }}>
                      {formData.name || "Document titel"}
                    </span>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Features Tab */}
            <TabsContent value="features" className="space-y-4 pt-2">
              <div className="space-y-3">
                <Label className="text-xs font-medium uppercase tracking-wider text-gray-400">Componenten</Label>

                <label className="flex items-start gap-3 rounded-lg border p-3 cursor-pointer hover:bg-gray-50 transition-colors">
                  <Checkbox
                    checked={formData.showB1Button}
                    onCheckedChange={(v) => updateForm({ showB1Button: !!v })}
                    className="mt-0.5"
                  />
                  <div>
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <BookOpen className="h-4 w-4 text-emerald-600" />
                      Taalniveau B1 knop
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Toon een knop waarmee lezers de samenvatting in eenvoudige taal (B1) kunnen lezen
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-3 rounded-lg border p-3 cursor-pointer hover:bg-gray-50 transition-colors">
                  <Checkbox
                    checked={formData.showInfoBox}
                    onCheckedChange={(v) => updateForm({ showInfoBox: !!v })}
                    className="mt-0.5"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Info className="h-4 w-4 text-blue-600" />
                      Informatie box
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Toon een uitklapbare informatiebox onderaan het document
                    </p>
                    {formData.showInfoBox && (
                      <Input
                        value={formData.infoBoxLabel}
                        onChange={(e) => updateForm({ infoBoxLabel: e.target.value })}
                        placeholder="Meer informatie"
                        className="mt-2 text-xs"
                        onClick={(e) => e.stopPropagation()}
                      />
                    )}
                  </div>
                </label>

                <label className="flex items-start gap-3 rounded-lg border p-3 cursor-pointer hover:bg-gray-50 transition-colors">
                  <Checkbox
                    checked={formData.showChatWidget}
                    onCheckedChange={(v) => updateForm({ showChatWidget: !!v })}
                    className="mt-0.5"
                  />
                  <div>
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <MessageSquare className="h-4 w-4 text-purple-600" />
                      AI Chat widget
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Toon de AI-chat widget waarmee lezers vragen kunnen stellen over het document
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-3 rounded-lg border p-3 cursor-pointer hover:bg-gray-50 transition-colors">
                  <Checkbox
                    checked={formData.showTableOfContents}
                    onCheckedChange={(v) => updateForm({ showTableOfContents: !!v })}
                    className="mt-0.5"
                  />
                  <div>
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <List className="h-4 w-4 text-orange-600" />
                      Inhoudsopgave
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Toon een inhoudsopgave sidebar voor navigatie binnen het document
                    </p>
                  </div>
                </label>
              </div>
            </TabsContent>
          </Tabs>

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

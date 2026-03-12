"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  BarChart3,
  BookOpen,
  Check,
  CheckCircle,
  ChevronDown,
  Download,
  Eye,
  FileText,
  Hash,
  Info,
  Layout,
  List,
  Loader2,
  MessageSquare,
  Palette,
  Settings,
  Trash2,
  Type,
  Upload,
  User,
  Image as ImageIcon,
  Calendar,
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
  logoPosition?: "left" | "center" | "right";
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

const LOGO_POSITION_OPTIONS = [
  { value: "left", label: "Links" },
  { value: "center", label: "Midden" },
  { value: "right", label: "Rechts" },
];

// Mock data for preview
const MOCK = {
  title: "Voorbeelddocument",
  displayTitle: "Uw document wordt hier weergegeven met de gekozen stijl",
  organization: "Mijn organisatie",
  author: "Jan de Vries",
  date: "12 maart 2026",
  version: "1.0",
  tags: ["Voorbeeld", "Preview", "Sjabloon"],
  summary: "Dit is een voorbeeldtekst om te laten zien hoe uw documenten eruit zullen zien met dit sjabloon. De opmaak, kleuren en typografie worden direct toegepast zodat u het resultaat kunt beoordelen voordat u het sjabloon opslaat.",
  keyPoints: [
    { text: "Hier verschijnt het eerste hoofdpunt van het document", num: 1 },
    { text: "Het tweede hoofdpunt wordt op dezelfde manier weergegeven", num: 2 },
    { text: "Elk hoofdpunt kan worden uitgevouwen voor meer uitleg", num: 3 },
  ],
  findings: [
    { category: "Categorie A", title: "Eerste bevinding", content: "Een korte beschrijving van de bevinding. Dit geeft lezers snel inzicht in de belangrijkste conclusies." },
    { category: "Categorie B", title: "Tweede bevinding", content: "Nog een samenvatting van een bevinding uit het document. De lay-out past zich aan aan uw sjablooninstellingen." },
  ],
};

export default function TemplateEditPage() {
  const params = useParams();
  const router = useRouter();
  const [template, setTemplate] = useState<TemplateData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(true);

  const [formData, setFormData] = useState<FormData | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [dirty, setDirty] = useState(false);

  // Load template
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/templates/${params.id}`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error();
        const { data } = await res.json();
        setTemplate(data);
        setFormData({
          name: data.name,
          primary: data.primary,
          primaryDark: data.primaryDark,
          primaryLight: data.primaryLight,
          accentColor: data.accentColor || "",
          backgroundColor: data.backgroundColor || "#FFFFFF",
          logo: data.logo,
          favicon: data.favicon,
          fontHeading: data.fontHeading || "",
          fontBody: data.fontBody || "",
          headerStyle: data.headerStyle,
          cornerRadius: data.cornerRadius || "medium",
          logoPosition: data.logoPosition || "center",
          showB1Button: data.showB1Button,
          showInfoBox: data.showInfoBox,
          infoBoxLabel: data.infoBoxLabel,
          showChatWidget: data.showChatWidget ?? true,
          showTableOfContents: data.showTableOfContents ?? true,
          footerText: data.footerText || "",
          footerLink: data.footerLink || "",
        });
      } catch {
        toast.error("Sjabloon niet gevonden.");
        router.push("/dashboard/settings/sjablonen");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [params.id, router]);

  // Explicit save function
  async function handleSave() {
    if (!template || !formData) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/templates/${template.templateId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        toast.error(errorData.error || "Opslaan mislukt.");
        return;
      }
      setSaved(true);
      setDirty(false);
      toast.success("Sjabloon opgeslagen!");
    } catch {
      toast.error("Opslaan mislukt.");
    } finally {
      setSaving(false);
    }
  }

  const updateForm = useCallback((updates: Partial<FormData>) => {
    setFormData((prev) => (prev ? { ...prev, ...updates } : prev));
    setDirty(true);
    setSaved(false);
  }, []);

  const handleLogoUpload = useCallback(async (file: File) => {
    if (!template) return;
    setUploadingLogo(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/templates/${template.templateId}/logo`, {
        method: "POST",
        body: fd,
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Upload mislukt");
      }
      const { logo } = await res.json();
      updateForm({ logo });
      toast.success("Logo geüpload");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Logo uploaden mislukt");
    } finally {
      setUploadingLogo(false);
      if (logoInputRef.current) logoInputRef.current.value = "";
    }
  }, [template, updateForm]);

  const handleDeleteLogo = useCallback(async () => {
    if (!template) return;
    setUploadingLogo(true);
    try {
      const res = await fetch(`/api/templates/${template.templateId}/logo`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      updateForm({ logo: undefined });
      toast.success("Logo verwijderd");
    } catch {
      toast.error("Logo verwijderen mislukt");
    } finally {
      setUploadingLogo(false);
    }
  }, [template, updateForm]);

  if (loading || !formData) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-10 w-80" />
        <div className="grid grid-cols-2 gap-6">
          <Skeleton className="h-[600px]" />
          <Skeleton className="h-[600px]" />
        </div>
      </div>
    );
  }

  const radiusCss = { none: "rounded-none", small: "rounded", medium: "rounded-lg", large: "rounded-2xl" }[formData.cornerRadius || "medium"] || "rounded-lg";

  return (
    <div className="flex h-[calc(100vh-64px)] flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between border-b bg-white px-4 py-2.5">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard/settings/sjablonen")}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            Sjablonen
          </Button>
          <Separator orientation="vertical" className="h-6" />
          <span className="font-medium">{template?.name}</span>
          {template?.isSystem && (
            <Badge variant="secondary" className="text-[10px]">Systeem</Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {saved && !dirty && (
            <span className="flex items-center gap-1 text-xs text-green-600">
              <Check className="h-3 w-3" />
              Opgeslagen
            </span>
          )}
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving || !dirty}
            className="bg-[#0062EB] hover:bg-[#0050C0]"
          >
            {saving ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Check className="mr-1.5 h-3.5 w-3.5" />
            )}
            {saving ? "Opslaan..." : "Opslaan"}
          </Button>
        </div>
      </div>

      {/* Split view */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Editor */}
        <div className="w-[420px] flex-shrink-0 overflow-y-auto border-r bg-white p-4">
          <Tabs defaultValue="branding" className="w-full">
            <TabsList variant="line" className="w-full justify-start mb-4">
              <TabsTrigger value="branding" className="gap-1 text-xs">
                <ImageIcon className="h-3 w-3" />
                Branding
              </TabsTrigger>
              <TabsTrigger value="colors" className="gap-1 text-xs">
                <Palette className="h-3 w-3" />
                Kleuren
              </TabsTrigger>
              <TabsTrigger value="typography" className="gap-1 text-xs">
                <Type className="h-3 w-3" />
                Tekst
              </TabsTrigger>
              <TabsTrigger value="layout" className="gap-1 text-xs">
                <Layout className="h-3 w-3" />
                Layout
              </TabsTrigger>
              <TabsTrigger value="features" className="gap-1 text-xs">
                <Settings className="h-3 w-3" />
                Functies
              </TabsTrigger>
            </TabsList>

            {/* Branding */}
            <TabsContent value="branding" className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Sjabloonnaam</Label>
                <Input value={formData.name} onChange={(e) => updateForm({ name: e.target.value })} className="text-sm" />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Logo</Label>
                <input ref={logoInputRef} type="file" accept="image/svg+xml,image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleLogoUpload(f); }} />
                {formData.logo ? (
                  <div className="flex items-center gap-2 rounded-lg border p-2">
                    <img src={formData.logo} alt="Logo" className="h-8 max-w-[80px] object-contain" />
                    <span className="flex-1 truncate text-[10px] text-gray-400">{formData.logo.split("/").pop()}</span>
                    <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={() => logoInputRef.current?.click()} disabled={uploadingLogo}>Wijzig</Button>
                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-gray-400 hover:text-red-500" onClick={handleDeleteLogo} disabled={uploadingLogo}>
                      {uploadingLogo ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                    </Button>
                  </div>
                ) : (
                  <Button type="button" variant="outline" size="sm" className="w-full text-xs" onClick={() => logoInputRef.current?.click()} disabled={uploadingLogo}>
                    {uploadingLogo ? <Loader2 className="mr-1.5 h-3 w-3 animate-spin" /> : <Upload className="mr-1.5 h-3 w-3" />}
                    Logo uploaden
                  </Button>
                )}
                <p className="text-[10px] text-muted-foreground">SVG, PNG, JPG of WebP. Max 2MB.</p>
              </div>

              <Separator />

              <div className="space-y-1.5">
                <Label className="text-xs">Footer tekst</Label>
                <Input value={formData.footerText || ""} onChange={(e) => updateForm({ footerText: e.target.value })} placeholder="© 2026 Mijn organisatie" className="text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Footer link</Label>
                <Input value={formData.footerLink || ""} onChange={(e) => updateForm({ footerLink: e.target.value })} placeholder="https://..." className="text-sm" />
              </div>
            </TabsContent>

            {/* Colors */}
            <TabsContent value="colors" className="space-y-4">
              {([["primary", "Primair"], ["primaryDark", "Donker"], ["primaryLight", "Licht"]] as const).map(([key, label]) => (
                <div key={key} className="space-y-1">
                  <Label className="text-xs">{label}</Label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={formData[key]} onChange={(e) => updateForm({ [key]: e.target.value })} className="h-8 w-8 cursor-pointer rounded border p-0.5" />
                    <Input value={formData[key]} onChange={(e) => updateForm({ [key]: e.target.value })} className="font-mono text-xs" />
                  </div>
                </div>
              ))}
              <Separator />
              <div className="space-y-1">
                <Label className="text-xs">Accentkleur</Label>
                <div className="flex items-center gap-2">
                  <input type="color" value={formData.accentColor || "#FF6B00"} onChange={(e) => updateForm({ accentColor: e.target.value })} className="h-8 w-8 cursor-pointer rounded border p-0.5" />
                  <Input value={formData.accentColor || ""} onChange={(e) => updateForm({ accentColor: e.target.value })} placeholder="Optioneel" className="font-mono text-xs" />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Achtergrondkleur</Label>
                <div className="flex items-center gap-2">
                  <input type="color" value={formData.backgroundColor || "#FFFFFF"} onChange={(e) => updateForm({ backgroundColor: e.target.value })} className="h-8 w-8 cursor-pointer rounded border p-0.5" />
                  <Input value={formData.backgroundColor || ""} onChange={(e) => updateForm({ backgroundColor: e.target.value })} placeholder="#FFFFFF" className="font-mono text-xs" />
                </div>
              </div>
              {/* Swatch preview */}
              <div className="flex gap-2 pt-2">
                {[
                  { color: formData.primary, label: "P" },
                  { color: formData.primaryDark, label: "D" },
                  { color: formData.primaryLight, label: "L" },
                  ...(formData.accentColor ? [{ color: formData.accentColor, label: "A" }] : []),
                ].map((c) => (
                  <div key={c.label} className="flex flex-col items-center gap-0.5">
                    <span className="h-8 w-8 rounded-md border" style={{ backgroundColor: c.color }} />
                    <span className="text-[9px] text-gray-400">{c.label}</span>
                  </div>
                ))}
              </div>
            </TabsContent>

            {/* Typography */}
            <TabsContent value="typography" className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Lettertype koppen</Label>
                <Select value={formData.fontHeading || "system"} onValueChange={(v) => updateForm({ fontHeading: v === "system" ? "" : v })}>
                  <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FONT_OPTIONS.map((f) => (
                      <SelectItem key={f.value || "system"} value={f.value || "system"}>
                        <span style={{ fontFamily: f.value || undefined }}>{f.label}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Lettertype tekst</Label>
                <Select value={formData.fontBody || "system"} onValueChange={(v) => updateForm({ fontBody: v === "system" ? "" : v })}>
                  <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FONT_OPTIONS.map((f) => (
                      <SelectItem key={f.value || "system"} value={f.value || "system"}>
                        <span style={{ fontFamily: f.value || undefined }}>{f.label}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>

            {/* Layout */}
            <TabsContent value="layout" className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Header stijl</Label>
                <Select value={formData.headerStyle} onValueChange={(v) => updateForm({ headerStyle: v as FormData["headerStyle"] })}>
                  <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Standaard header</SelectItem>
                    <SelectItem value="split-bar">Logo + titelbalk</SelectItem>
                    <SelectItem value="inline-logo">Logo + titel inline</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Positie logo</Label>
                <div className="grid grid-cols-3 gap-1.5">
                  {LOGO_POSITION_OPTIONS.map((opt) => (
                    <button key={opt.value} type="button" onClick={() => updateForm({ logoPosition: opt.value as FormData["logoPosition"] })}
                      className={`flex flex-col items-center gap-1 rounded border p-2.5 text-[10px] transition-all ${formData.logoPosition === opt.value ? "border-primary ring-1 ring-primary/20" : "hover:border-gray-400"}`}>
                      <div className="flex h-5 w-full items-center px-1">
                        <div
                          className={`h-3 w-6 rounded-sm bg-gray-400 ${opt.value === "left" ? "mr-auto" : opt.value === "center" ? "mx-auto" : "ml-auto"}`}
                        />
                      </div>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* Features */}
            <TabsContent value="features" className="space-y-3">
              {[
                { key: "showB1Button" as const, icon: <BookOpen className="h-3.5 w-3.5 text-emerald-600" />, label: "Taalniveau B1 knop", desc: "Samenvatting in eenvoudige taal" },
                { key: "showInfoBox" as const, icon: <Info className="h-3.5 w-3.5 text-blue-600" />, label: "Informatie box", desc: "Uitklapbare info onderaan" },
                { key: "showChatWidget" as const, icon: <MessageSquare className="h-3.5 w-3.5 text-purple-600" />, label: "AI Chat widget", desc: "Vragen stellen over het document" },
                { key: "showTableOfContents" as const, icon: <List className="h-3.5 w-3.5 text-orange-600" />, label: "Inhoudsopgave", desc: "Navigatie sidebar" },
              ].map((feat) => (
                <label key={feat.key} className="flex items-start gap-2.5 rounded-lg border p-2.5 cursor-pointer hover:bg-gray-50 transition-colors">
                  <Checkbox checked={!!formData[feat.key]} onCheckedChange={(v) => updateForm({ [feat.key]: !!v })} className="mt-0.5" />
                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-medium">{feat.icon}{feat.label}</div>
                    <p className="text-[10px] text-muted-foreground">{feat.desc}</p>
                  </div>
                </label>
              ))}
              {formData.showInfoBox && (
                <div className="pl-7 space-y-1">
                  <Label className="text-xs">Info box label</Label>
                  <Input value={formData.infoBoxLabel} onChange={(e) => updateForm({ infoBoxLabel: e.target.value })} placeholder="Meer informatie" className="text-xs" />
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Right: Live Preview */}
        <div className="flex-1 overflow-y-auto" style={{ backgroundColor: formData.backgroundColor || "#F5F7FA" }}>
          <div className="min-h-full" style={{ fontFamily: formData.fontBody || undefined }}>

            {/* Header preview */}
            {formData.headerStyle === "split-bar" && formData.logo ? (
              <header>
                <div className={`border-b border-gray-200 bg-white px-3 pb-4 pt-2 ${formData.logoPosition === "left" ? "text-left" : formData.logoPosition === "right" ? "text-right" : "text-center"}`}>
                  <img src={formData.logo} alt="" className={`h-[50px] ${formData.logoPosition === "left" ? "" : formData.logoPosition === "right" ? "ml-auto" : "mx-auto"}`} />
                </div>
                <div className="px-4 py-3" style={{ backgroundColor: formData.primary }}>
                  <h1 className="text-base font-normal text-white" style={{ fontFamily: formData.fontHeading || undefined }}>
                    {MOCK.displayTitle}
                  </h1>
                </div>
              </header>
            ) : formData.headerStyle === "inline-logo" && formData.logo ? (
              <header className={`flex items-center gap-4 px-6 py-3 ${formData.logoPosition === "right" ? "flex-row-reverse" : ""}`} style={{ backgroundColor: formData.primary }}>
                <img src={formData.logo} alt="" className="h-8 bg-white/20 p-1 rounded" />
                <h1 className={`text-base font-bold text-white ${formData.logoPosition === "center" ? "flex-1 text-center" : "flex-1"}`} style={{ fontFamily: formData.fontHeading || undefined }}>
                  {MOCK.displayTitle}
                </h1>
              </header>
            ) : (
              <header className="sticky top-0 z-10 border-b bg-white shadow-sm">
                <div className={`flex items-center px-6 py-3 ${formData.logo ? "gap-3" : ""} ${formData.logoPosition === "right" ? "flex-row-reverse" : formData.logoPosition === "center" ? "justify-center" : "justify-between"}`}>
                  {formData.logo && (
                    <img src={formData.logo} alt="" className="h-6" />
                  )}
                  <h1 className="text-base font-semibold text-gray-900" style={{ fontFamily: formData.fontHeading || undefined }}>
                    {MOCK.displayTitle}
                  </h1>
                </div>
              </header>
            )}

            {/* Content */}
            <div className="mx-auto max-w-[900px] px-4 py-6">
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-[200px_1fr]">

                {/* Sidebar */}
                <aside>
                  <div className={`bg-white p-4 shadow-sm ${radiusCss}`}>
                    <h2 className="text-xs font-semibold text-gray-900 mb-2">{MOCK.title}</h2>
                    <div className="space-y-2 text-[10px]">
                      <div className="flex items-center gap-2">
                        <User className="h-3 w-3 text-gray-400" />
                        <div>
                          <p className="text-[9px] uppercase tracking-wider text-gray-400">Auteur</p>
                          <p className="text-gray-700">{MOCK.author}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3 w-3 text-gray-400" />
                        <div>
                          <p className="text-[9px] uppercase tracking-wider text-gray-400">Datum</p>
                          <p className="text-gray-700">{MOCK.date}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Hash className="h-3 w-3 text-gray-400" />
                        <div>
                          <p className="text-[9px] uppercase tracking-wider text-gray-400">Versie</p>
                          <p className="text-gray-700">{MOCK.version}</p>
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1 border-t pt-3">
                      {MOCK.tags.map((tag) => (
                        <span key={tag} className={`inline-block px-2 py-0.5 text-[9px] font-medium ${radiusCss}`} style={{ backgroundColor: formData.primaryLight, color: formData.primary }}>
                          {tag}
                        </span>
                      ))}
                    </div>
                    <div className="mt-3 flex gap-1.5">
                      <button className={`flex-1 flex items-center justify-center gap-1 border text-[9px] py-1.5 ${radiusCss}`}>
                        <Download className="h-2.5 w-2.5" /> Download
                      </button>
                      <button className={`flex items-center justify-center px-2 py-1.5 text-white ${radiusCss}`} style={{ backgroundColor: formData.primary }}>
                        <Eye className="h-2.5 w-2.5" />
                      </button>
                    </div>
                  </div>

                  {/* Language level */}
                  <div className={`bg-white p-4 shadow-sm mt-4 ${radiusCss}`}>
                    <p className="text-[9px] uppercase tracking-wider text-gray-400 mb-2">Taalniveau</p>
                    <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: "100%", background: `linear-gradient(90deg, ${formData.primary}88, ${formData.primary})` }} />
                    </div>
                    <div className="mt-1 flex justify-between text-[8px] text-gray-300">
                      <span>B1</span><span>B2</span><span>C1</span>
                      <span style={{ color: formData.primary }} className="font-bold">Origineel</span>
                    </div>
                  </div>
                </aside>

                {/* Main content */}
                <main className="space-y-4">
                  {/* Audience badges */}
                  <div className="flex gap-1.5">
                    <Badge variant="outline" className={`text-[9px] bg-white shadow-sm ${radiusCss}`}>Beleidsvisie</Badge>
                    <Badge variant="outline" className={`text-[9px] bg-white shadow-sm ${radiusCss}`}>Voor: Burgers & professionals</Badge>
                  </div>

                  {/* Summary */}
                  <section className={`bg-white p-5 shadow-sm ${radiusCss}`}>
                    <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-gray-900" style={{ fontFamily: formData.fontHeading || undefined }}>
                      <FileText className="h-4 w-4" style={{ color: formData.primary }} />
                      Samenvatting
                    </h2>
                    <p className="text-xs leading-relaxed text-gray-700" style={{ fontFamily: formData.fontBody || undefined }}>
                      {MOCK.summary}
                    </p>
                  </section>

                  {/* Key Points */}
                  <section className={`bg-white p-5 shadow-sm ${radiusCss}`}>
                    <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-gray-900" style={{ fontFamily: formData.fontHeading || undefined }}>
                      <CheckCircle className="h-4 w-4" style={{ color: formData.primary }} />
                      Hoofdpunten
                    </h2>
                    <div className="space-y-2">
                      {MOCK.keyPoints.map((kp) => (
                        <div key={kp.num} className={`border bg-white ${radiusCss} p-3 flex items-center gap-3`}>
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white" style={{ backgroundColor: formData.primary }}>
                            {kp.num}
                          </span>
                          <span className="flex-1 text-xs text-gray-700">{kp.text}</span>
                          <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
                        </div>
                      ))}
                    </div>
                  </section>

                  {/* Findings */}
                  <section className={`bg-white p-5 shadow-sm ${radiusCss}`}>
                    <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-gray-900" style={{ fontFamily: formData.fontHeading || undefined }}>
                      <BarChart3 className="h-4 w-4" style={{ color: formData.primary }} />
                      Belangrijke Bevindingen
                    </h2>
                    <div className="grid gap-3 grid-cols-2">
                      {MOCK.findings.map((f, i) => (
                        <div key={i} className={`border bg-white p-4 ${radiusCss}`}>
                          <span className={`inline-block px-2 py-0.5 text-[9px] font-medium mb-2 ${radiusCss}`} style={{ backgroundColor: formData.primaryLight, color: formData.primary }}>
                            {f.category}
                          </span>
                          <h3 className="text-xs font-semibold text-gray-900 mb-1">{f.title}</h3>
                          <p className="text-[10px] text-gray-500 leading-relaxed">{f.content}</p>
                        </div>
                      ))}
                    </div>
                  </section>

                  {/* Info box */}
                  {formData.showInfoBox && (
                    <section className={`border-2 p-5 ${radiusCss}`} style={{ borderColor: formData.primaryLight, backgroundColor: formData.primaryLight + "33" }}>
                      <h3 className="text-xs font-semibold mb-1" style={{ color: formData.primary }}>
                        <Info className="h-3.5 w-3.5 inline mr-1.5" />
                        {formData.infoBoxLabel || "Meer informatie"}
                      </h3>
                      <p className="text-[10px] text-gray-600">Dit is een voorbeeld van de informatie box die onderaan het document wordt getoond.</p>
                    </section>
                  )}

                  {/* Footer */}
                  {formData.footerText && (
                    <footer className="text-center py-4 border-t text-[10px] text-gray-400">
                      {formData.footerLink ? (
                        <a href={formData.footerLink} className="hover:underline" style={{ color: formData.primary }}>{formData.footerText}</a>
                      ) : formData.footerText}
                    </footer>
                  )}
                </main>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

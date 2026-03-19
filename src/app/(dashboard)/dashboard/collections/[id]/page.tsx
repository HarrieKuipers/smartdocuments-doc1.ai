"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  FileText,
  Globe,
  Lock,
  MessageSquare,
  Pencil,
  Plus,
  Loader2,
  ExternalLink,
  Trash2,
  Check,
  X,
  BarChart3,
  Code,
  Copy,
  Eye,
  EyeOff,
  Palette,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

interface TemplateOption {
  templateId: string;
  name: string;
  primary: string;
  isSystem: boolean;
}

interface EmbedConfig {
  whitelabel: boolean;
  defaultMode: "chat" | "summary" | "full";
  defaultTheme: "light" | "dark";
  colorOverride?: string;
}

interface Collection {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  template?: string;
  access?: { type: "public" | "password"; password?: string };
  chatIntro?: string;
  chatPlaceholder?: string;
  chatSuggestions?: string[];
  embedConfig?: EmbedConfig;
}

interface Document {
  _id: string;
  title: string;
  shortId: string;
  status: string;
  authors: string[];
  createdAt: string;
  collectionId?: string;
  coverImageUrl?: string;
  customCoverUrl?: string;
}

export default function CollectionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [collection, setCollection] = useState<Collection | null>(null);
  const [docs, setDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit state
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [saving, setSaving] = useState(false);

  // Add documents dialog
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [availableDocs, setAvailableDocs] = useState<Document[]>([]);
  const [selectedDocIds, setSelectedDocIds] = useState<Set<string>>(new Set());
  const [loadingAvailable, setLoadingAvailable] = useState(false);
  const [addingDocs, setAddingDocs] = useState(false);

  // Access control
  const [accessType, setAccessType] = useState<"public" | "password">("public");
  const [accessPassword, setAccessPassword] = useState("");
  const [savingAccess, setSavingAccess] = useState(false);

  // Template
  const [templateOptions, setTemplateOptions] = useState<TemplateOption[]>([]);
  const [templateId, setTemplateId] = useState("doc1");
  const [savingTemplate, setSavingTemplate] = useState(false);

  // Chat settings
  const [chatIntro, setChatIntro] = useState("");
  const [chatPlaceholder, setChatPlaceholder] = useState("");
  const [chatSuggestions, setChatSuggestions] = useState<string[]>([]);
  const [chatSuggestionInput, setChatSuggestionInput] = useState("");
  const [savingChat, setSavingChat] = useState(false);
  const [precaching, setPrecaching] = useState(false);

  // Embed settings
  const [embedWhitelabel, setEmbedWhitelabel] = useState(false);
  const [embedMode, setEmbedMode] = useState<"chat" | "summary" | "full">("full");
  const [embedTheme, setEmbedTheme] = useState<"light" | "dark">("light");
  const [embedColorOverride, setEmbedColorOverride] = useState("");
  const [embedWidth, setEmbedWidth] = useState("100%");
  const [embedHeight, setEmbedHeight] = useState("600");
  const [savingEmbed, setSavingEmbed] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Delete state
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchData();
    fetch("/api/templates")
      .then((r) => r.json())
      .then(({ data }) => setTemplateOptions(data))
      .catch(() => {});
  }, [params.id]);

  async function fetchData() {
    try {
      const [colRes, docsRes] = await Promise.all([
        fetch(`/api/collections/${params.id}`),
        fetch(`/api/documents?collectionId=${params.id}`),
      ]);
      if (colRes.ok) {
        const col = await colRes.json();
        setCollection(col.data);
        setEditName(col.data.name);
        setEditDescription(col.data.description || "");
        setAccessType(col.data.access?.type || "public");
        setTemplateId(col.data.template || "doc1");
        setChatIntro(col.data.chatIntro || "");
        setChatPlaceholder(col.data.chatPlaceholder || "");
        setChatSuggestions(col.data.chatSuggestions || []);
        if (col.data.embedConfig) {
          setEmbedWhitelabel(col.data.embedConfig.whitelabel || false);
          setEmbedMode(col.data.embedConfig.defaultMode || "full");
          setEmbedTheme(col.data.embedConfig.defaultTheme || "light");
          setEmbedColorOverride(col.data.embedConfig.colorOverride || "");
        }
      }
      if (docsRes.ok) {
        const d = await docsRes.json();
        setDocs(d.data || []);
      }
    } catch {
      toast.error("Kon collectie niet laden.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveEdit() {
    if (!editName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/collections/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName, description: editDescription }),
      });
      if (res.ok) {
        const { data } = await res.json();
        setCollection(data);
        setEditing(false);
        toast.success("Collectie bijgewerkt!");
      } else {
        toast.error("Kon collectie niet bijwerken.");
      }
    } catch {
      toast.error("Kon collectie niet bijwerken.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Weet je zeker dat je deze collectie wilt verwijderen? De documenten worden niet verwijderd.")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/collections/${params.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("Collectie verwijderd!");
        router.push("/dashboard/collections");
      } else {
        toast.error("Kon collectie niet verwijderen.");
      }
    } catch {
      toast.error("Kon collectie niet verwijderen.");
    } finally {
      setDeleting(false);
    }
  }

  async function handleSaveAccess() {
    setSavingAccess(true);
    try {
      const body: Record<string, unknown> = {
        access: { type: accessType },
      };
      if (accessType === "password" && accessPassword) {
        body.access = { type: "password", password: accessPassword };
      }
      const res = await fetch(`/api/collections/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const { data } = await res.json();
        setCollection(data);
        setAccessPassword("");
        toast.success("Toegangsinstellingen opgeslagen!");
      } else {
        toast.error("Kon instellingen niet opslaan.");
      }
    } catch {
      toast.error("Kon instellingen niet opslaan.");
    } finally {
      setSavingAccess(false);
    }
  }

  async function handleSaveChat() {
    setSavingChat(true);
    try {
      const res = await fetch(`/api/collections/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatIntro: chatIntro || "",
          chatPlaceholder: chatPlaceholder || "",
          chatSuggestions: chatSuggestions,
        }),
      });
      if (res.ok) {
        const { data } = await res.json();
        setCollection(data);
        toast.success("Chat-instellingen opgeslagen!");
      } else {
        toast.error("Kon chat-instellingen niet opslaan.");
      }
    } catch {
      toast.error("Kon chat-instellingen niet opslaan.");
    } finally {
      setSavingChat(false);
    }
  }

  async function handlePrecache() {
    if (chatSuggestions.length === 0) {
      toast.error("Voeg eerst suggestievragen toe.");
      return;
    }
    setPrecaching(true);
    toast.info("Antwoorden worden vooraf gegenereerd...");
    try {
      const cacheRes = await fetch(
        `/api/collections/${params.id}/precache-chat`,
        { method: "POST" }
      );
      if (cacheRes.ok) {
        const { data: cacheData } = await cacheRes.json();
        toast.success(
          `${cacheData.cached} antwoord${cacheData.cached !== 1 ? "en" : ""} vooraf gegenereerd!`
        );
      } else {
        toast.error("Kon antwoorden niet vooraf genereren.");
      }
    } catch {
      toast.error("Kon antwoorden niet vooraf genereren.");
    } finally {
      setPrecaching(false);
    }
  }

  async function openAddDialog() {
    setAddDialogOpen(true);
    setLoadingAvailable(true);
    setSelectedDocIds(new Set());
    try {
      const res = await fetch("/api/documents?status=ready&limit=100");
      if (res.ok) {
        const { data } = await res.json();
        // Filter out documents already in this collection
        const currentDocIds = new Set(docs.map((d) => d._id));
        setAvailableDocs(
          (data || []).filter((d: Document) => !currentDocIds.has(d._id))
        );
      }
    } catch {
      toast.error("Kon documenten niet laden.");
    } finally {
      setLoadingAvailable(false);
    }
  }

  function toggleDocSelection(docId: string) {
    setSelectedDocIds((prev) => {
      const next = new Set(prev);
      if (next.has(docId)) {
        next.delete(docId);
      } else {
        next.add(docId);
      }
      return next;
    });
  }

  async function handleAddDocuments() {
    if (selectedDocIds.size === 0) return;
    setAddingDocs(true);
    try {
      const res = await fetch(`/api/collections/${params.id}/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentIds: Array.from(selectedDocIds) }),
      });
      if (res.ok) {
        toast.success(`${selectedDocIds.size} document(en) toegevoegd!`);
        setAddDialogOpen(false);
        fetchData();
      } else {
        toast.error("Kon documenten niet toevoegen.");
      }
    } catch {
      toast.error("Kon documenten niet toevoegen.");
    } finally {
      setAddingDocs(false);
    }
  }

  async function handleRemoveDocument(docId: string) {
    try {
      const res = await fetch(`/api/collections/${params.id}/documents`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId: docId }),
      });
      if (res.ok) {
        setDocs((prev) => prev.filter((d) => d._id !== docId));
        toast.success("Document verwijderd uit collectie.");
      } else {
        toast.error("Kon document niet verwijderen uit collectie.");
      }
    } catch {
      toast.error("Kon document niet verwijderen uit collectie.");
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/collections">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-1 h-4 w-4" />
              Terug
            </Button>
          </Link>
          {editing ? (
            <div className="flex items-center gap-3">
              <div className="space-y-1">
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="text-lg font-bold"
                  placeholder="Naam"
                />
                <Input
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Beschrijving (optioneel)"
                />
              </div>
              <Button
                size="sm"
                onClick={handleSaveEdit}
                disabled={saving || !editName.trim()}
                className="bg-[#0062EB] hover:bg-[#0050C0]"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setEditing(false);
                  setEditName(collection?.name || "");
                  setEditDescription(collection?.description || "");
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold">
                  {collection?.name || "Collectie"}
                </h1>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditing(true)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              </div>
              {collection?.description && (
                <p className="text-muted-foreground">{collection.description}</p>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/dashboard/collections/${params.id}/analytics`}>
            <Button variant="outline" size="sm">
              <BarChart3 className="mr-1 h-4 w-4" />
              Analytics
            </Button>
          </Link>
          {collection?.slug && (
            <Link href={`/c/${collection.slug}`} target="_blank">
              <Button variant="outline" size="sm">
                <ExternalLink className="mr-1 h-4 w-4" />
                Openbare pagina
              </Button>
            </Link>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            disabled={deleting}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            {deleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Settings */}
      <Card>
        <CardContent className="divide-y p-0">
          {/* Access control */}
          <div className="flex items-center gap-3 px-4 py-3">
            <Label className="w-20 shrink-0 text-sm">Toegang</Label>
            <Select
              value={accessType}
              onValueChange={(v: "public" | "password") => setAccessType(v)}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public">Openbaar</SelectItem>
                <SelectItem value="password">Met wachtwoord</SelectItem>
              </SelectContent>
            </Select>
            {accessType === "password" && (
              <Input
                type="password"
                value={accessPassword}
                onChange={(e) => setAccessPassword(e.target.value)}
                placeholder={
                  collection?.access?.type === "password"
                    ? "Nieuw wachtwoord"
                    : "Wachtwoord instellen"
                }
                className="w-[200px]"
              />
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={handleSaveAccess}
              disabled={
                savingAccess ||
                (accessType === "password" &&
                  !accessPassword &&
                  collection?.access?.type !== "password")
              }
            >
              {savingAccess ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Template */}
          <div className="flex items-center gap-3 px-4 py-3">
            <Label className="w-20 shrink-0 text-sm">Sjabloon</Label>
            <Select
              value={templateId}
              onValueChange={async (v) => {
                setTemplateId(v);
                setSavingTemplate(true);
                try {
                  const res = await fetch(`/api/collections/${params.id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ template: v }),
                  });
                  if (res.ok) {
                    toast.success("Sjabloon opgeslagen!");
                  } else {
                    toast.error("Kon sjabloon niet opslaan.");
                  }
                } catch {
                  toast.error("Kon sjabloon niet opslaan.");
                } finally {
                  setSavingTemplate(false);
                }
              }}
            >
              <SelectTrigger className="w-[220px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {templateOptions.map((t) => (
                  <SelectItem key={t.templateId} value={t.templateId}>
                    <span className="flex items-center gap-2">
                      <span
                        className="inline-block h-3 w-3 rounded-full"
                        style={{ backgroundColor: t.primary }}
                      />
                      {t.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {savingTemplate && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </div>
        </CardContent>
      </Card>

      {/* Chat settings */}
      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
            <Label className="text-sm font-medium">Chat-instellingen</Label>
          </div>
          <div className="space-y-2">
            <Input
              value={chatIntro}
              onChange={(e) => setChatIntro(e.target.value)}
              placeholder="Intro tekst (bijv. Stel een vraag over de documenten)"
            />
            <Input
              value={chatPlaceholder}
              onChange={(e) => setChatPlaceholder(e.target.value)}
              placeholder="Placeholder (bijv. Vraag iets over de verkiezingsprogramma's...)"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Suggestievragen</Label>
            <div className="flex flex-wrap gap-1.5">
              {chatSuggestions.map((s, i) => (
                <Badge key={i} variant="secondary" className="gap-1">
                  {s}
                  <button onClick={() => setChatSuggestions(chatSuggestions.filter((_, j) => j !== i))}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={chatSuggestionInput}
                onChange={(e) => setChatSuggestionInput(e.target.value)}
                placeholder="Voeg suggestievraag toe"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && chatSuggestionInput.trim()) {
                    e.preventDefault();
                    setChatSuggestions([...chatSuggestions, chatSuggestionInput.trim()]);
                    setChatSuggestionInput("");
                  }
                }}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (chatSuggestionInput.trim()) {
                    setChatSuggestions([...chatSuggestions, chatSuggestionInput.trim()]);
                    setChatSuggestionInput("");
                  }
                }}
              >
                Toevoegen
              </Button>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleSaveChat}
              disabled={savingChat || precaching}
              className="bg-[#0062EB] hover:bg-[#0050C0]"
            >
              {savingChat && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Opslaan
            </Button>
            {chatSuggestions.length > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={handlePrecache}
                disabled={savingChat || precaching}
              >
                {precaching && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {precaching ? "Genereren..." : "Pre-analyse"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Embed & White-label settings */}
      {collection?.slug && (
        <EmbedSection
          collectionSlug={collection.slug}
          collectionId={collection._id}
          embedWhitelabel={embedWhitelabel}
          setEmbedWhitelabel={setEmbedWhitelabel}
          embedMode={embedMode}
          setEmbedMode={setEmbedMode}
          embedTheme={embedTheme}
          setEmbedTheme={setEmbedTheme}
          embedColorOverride={embedColorOverride}
          setEmbedColorOverride={setEmbedColorOverride}
          embedWidth={embedWidth}
          setEmbedWidth={setEmbedWidth}
          embedHeight={embedHeight}
          setEmbedHeight={setEmbedHeight}
          savingEmbed={savingEmbed}
          setSavingEmbed={setSavingEmbed}
          copiedField={copiedField}
          setCopiedField={setCopiedField}
          paramsId={params.id as string}
        />
      )}

      {/* Add documents button */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {docs.length} document{docs.length !== 1 ? "en" : ""} in deze collectie
        </p>
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={openAddDialog}
              className="bg-[#0062EB] hover:bg-[#0050C0]"
            >
              <Plus className="mr-2 h-4 w-4" />
              Documenten toevoegen
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Documenten toevoegen</DialogTitle>
            </DialogHeader>
            {loadingAvailable ? (
              <div className="space-y-3 py-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-12" />
                ))}
              </div>
            ) : availableDocs.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">
                Geen beschikbare documenten gevonden.
              </p>
            ) : (
              <>
                <div className="max-h-[400px] space-y-2 overflow-y-auto">
                  {availableDocs.map((doc) => (
                    <label
                      key={doc._id}
                      className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
                    >
                      <Checkbox
                        checked={selectedDocIds.has(doc._id)}
                        onCheckedChange={() => toggleDocSelection(doc._id)}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{doc.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {doc.authors?.[0] || "Onbekend"} &middot;{" "}
                          {new Date(doc.createdAt).toLocaleDateString("nl-NL")}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
                <Button
                  onClick={handleAddDocuments}
                  disabled={selectedDocIds.size === 0 || addingDocs}
                  className="w-full bg-[#0062EB] hover:bg-[#0050C0]"
                >
                  {addingDocs && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {selectedDocIds.size} document(en) toevoegen
                </Button>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {/* Document list */}
      {docs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">
              Geen documenten in deze collectie.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {docs.map((doc) => (
            <Card
              key={doc._id}
              className="group relative overflow-hidden transition-shadow hover:shadow-md"
            >
              {(doc.customCoverUrl || doc.coverImageUrl) && (
                <Link href={`/dashboard/documents/${doc._id}/edit`}>
                  <div className="h-32 overflow-hidden bg-gray-100">
                    <img
                      src={doc.customCoverUrl || doc.coverImageUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </div>
                </Link>
              )}
              <CardContent className={`p-4 ${!(doc.customCoverUrl || doc.coverImageUrl) ? "pt-6" : ""}`}>
                <Link href={`/dashboard/documents/${doc._id}/edit`}>
                  <h3 className="mb-2 font-medium line-clamp-2 cursor-pointer hover:text-[#0062EB]">
                    {doc.title}
                  </h3>
                </Link>
                <p className="text-sm text-muted-foreground">
                  {doc.authors?.[0] || "Onbekend"}
                </p>
                <div className="mt-3 flex items-center justify-between">
                  <Badge
                    className={
                      doc.status === "ready"
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-700"
                    }
                  >
                    {doc.status === "ready" ? "Gepubliceerd" : doc.status}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {new Date(doc.createdAt).toLocaleDateString("nl-NL")}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveDocument(doc._id)}
                  className="absolute right-2 top-2 hidden text-muted-foreground hover:text-red-600 group-hover:flex"
                >
                  <X className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// -- Embed & White-label Section --
function EmbedSection({
  collectionSlug,
  collectionId,
  embedWhitelabel,
  setEmbedWhitelabel,
  embedMode,
  setEmbedMode,
  embedTheme,
  setEmbedTheme,
  embedColorOverride,
  setEmbedColorOverride,
  embedWidth,
  setEmbedWidth,
  embedHeight,
  setEmbedHeight,
  savingEmbed,
  setSavingEmbed,
  copiedField,
  setCopiedField,
  paramsId,
}: {
  collectionSlug: string;
  collectionId: string;
  embedWhitelabel: boolean;
  setEmbedWhitelabel: (v: boolean) => void;
  embedMode: "chat" | "summary" | "full";
  setEmbedMode: (v: "chat" | "summary" | "full") => void;
  embedTheme: "light" | "dark";
  setEmbedTheme: (v: "light" | "dark") => void;
  embedColorOverride: string;
  setEmbedColorOverride: (v: string) => void;
  embedWidth: string;
  setEmbedWidth: (v: string) => void;
  embedHeight: string;
  setEmbedHeight: (v: string) => void;
  savingEmbed: boolean;
  setSavingEmbed: (v: boolean) => void;
  copiedField: string | null;
  setCopiedField: (v: string | null) => void;
  paramsId: string;
}) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://doc1.ai";

  // Build embed URL with current settings
  const embedParams = new URLSearchParams();
  embedParams.set("mode", embedMode);
  if (embedTheme === "dark") embedParams.set("theme", "dark");
  if (embedWhitelabel) embedParams.set("whitelabel", "true");
  if (embedColorOverride) embedParams.set("color", embedColorOverride);

  const embedUrl = `${siteUrl}/embed/c/${collectionSlug}?${embedParams.toString()}`;
  const widthAttr = embedWidth.includes("%") ? embedWidth : `${embedWidth}px`;

  const iframeCode = `<iframe src="${embedUrl}" width="${widthAttr}" height="${embedHeight}" style="border: 1px solid #e5e7eb; border-radius: 8px;" frameborder="0" allowfullscreen></iframe>`;

  const scriptCode = `<div id="doc1-collection-${collectionSlug}"></div>
<script>
(function() {
  var c = document.getElementById('doc1-collection-${collectionSlug}');
  var f = document.createElement('iframe');
  f.src = '${embedUrl}';
  f.style.width = '${widthAttr}';
  f.style.height = '${embedHeight}px';
  f.style.border = '1px solid #e5e7eb';
  f.style.borderRadius = '8px';
  f.frameBorder = '0';
  f.allowFullscreen = true;
  c.appendChild(f);
})();
</script>`;

  async function handleSaveEmbed() {
    setSavingEmbed(true);
    try {
      const res = await fetch(`/api/collections/${paramsId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          embedConfig: {
            whitelabel: embedWhitelabel,
            defaultMode: embedMode,
            defaultTheme: embedTheme,
            colorOverride: embedColorOverride || undefined,
          },
        }),
      });
      if (res.ok) {
        toast.success("Embed-instellingen opgeslagen!");
      } else {
        toast.error("Kon embed-instellingen niet opslaan.");
      }
    } catch {
      toast.error("Kon embed-instellingen niet opslaan.");
    } finally {
      setSavingEmbed(false);
    }
  }

  async function copyToClipboard(text: string, field: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      toast.success("Gekopieerd naar klembord");
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      toast.error("Kon niet kopiëren.");
    }
  }

  return (
    <Card>
      <CardContent className="space-y-5 p-4">
        <div className="flex items-center gap-2">
          <Code className="h-4 w-4 text-muted-foreground" />
          <Label className="text-sm font-medium">Embed & White-label</Label>
        </div>

        {/* Settings grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Weergavemodus</Label>
            <Select
              value={embedMode}
              onValueChange={(v) => setEmbedMode(v as "chat" | "summary" | "full")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="full">Volledig (documenten + chat)</SelectItem>
                <SelectItem value="chat">Alleen chat</SelectItem>
                <SelectItem value="summary">Alleen documenten</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Thema</Label>
            <Select
              value={embedTheme}
              onValueChange={(v) => setEmbedTheme(v as "light" | "dark")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Licht</SelectItem>
                <SelectItem value="dark">Donker</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Breedte</Label>
            <Input
              value={embedWidth}
              onChange={(e) => setEmbedWidth(e.target.value)}
              placeholder="100% of 600"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Hoogte (px)</Label>
            <Input
              value={embedHeight}
              onChange={(e) => setEmbedHeight(e.target.value)}
              placeholder="600"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Kleur override (optioneel)</Label>
            <div className="flex gap-2">
              <Input
                value={embedColorOverride}
                onChange={(e) => setEmbedColorOverride(e.target.value)}
                placeholder="#0062EB"
                className="flex-1"
              />
              {embedColorOverride && (
                <div
                  className="h-9 w-9 shrink-0 rounded-md border"
                  style={{ backgroundColor: embedColorOverride }}
                />
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 pt-5">
            <Switch
              checked={embedWhitelabel}
              onCheckedChange={setEmbedWhitelabel}
              id="whitelabel"
            />
            <Label htmlFor="whitelabel" className="cursor-pointer text-sm">
              White-label <span className="text-xs text-muted-foreground">(verberg doc1.ai branding)</span>
            </Label>
          </div>
        </div>

        {/* Save button */}
        <Button
          size="sm"
          onClick={handleSaveEmbed}
          disabled={savingEmbed}
          className="bg-[#0062EB] hover:bg-[#0050C0]"
        >
          {savingEmbed && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Instellingen opslaan
        </Button>

        {/* Embed codes */}
        <div className="space-y-3 border-t pt-4">
          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Embed codes
          </Label>

          {/* iFrame */}
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">iFrame code</p>
            <div className="relative">
              <pre className="overflow-x-auto rounded-lg border bg-gray-50 p-3 text-xs text-gray-700">
                <code>{iframeCode}</code>
              </pre>
              <Button
                variant="outline"
                size="sm"
                className="absolute right-2 top-2"
                onClick={() => copyToClipboard(iframeCode, "iframe")}
              >
                {copiedField === "iframe" ? (
                  <Check className="mr-1 h-3.5 w-3.5 text-green-600" />
                ) : (
                  <Copy className="mr-1 h-3.5 w-3.5" />
                )}
                {copiedField === "iframe" ? "Gekopieerd" : "Kopiëren"}
              </Button>
            </div>
          </div>

          {/* JavaScript */}
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">JavaScript snippet</p>
            <div className="relative">
              <pre className="overflow-x-auto rounded-lg border bg-gray-50 p-3 text-xs text-gray-700">
                <code>{scriptCode}</code>
              </pre>
              <Button
                variant="outline"
                size="sm"
                className="absolute right-2 top-2"
                onClick={() => copyToClipboard(scriptCode, "script")}
              >
                {copiedField === "script" ? (
                  <Check className="mr-1 h-3.5 w-3.5 text-green-600" />
                ) : (
                  <Copy className="mr-1 h-3.5 w-3.5" />
                )}
                {copiedField === "script" ? "Gekopieerd" : "Kopiëren"}
              </Button>
            </div>
          </div>

          {/* Direct URL */}
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Directe URL</p>
            <div className="flex items-center gap-2">
              <Input value={embedUrl} readOnly className="font-mono text-xs" />
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(embedUrl, "url")}
                className="shrink-0"
              >
                {copiedField === "url" ? (
                  <Check className="mr-1 h-3.5 w-3.5 text-green-600" />
                ) : (
                  <Copy className="mr-1 h-3.5 w-3.5" />
                )}
                {copiedField === "url" ? "Gekopieerd" : "Kopiëren"}
              </Button>
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className="space-y-1.5 border-t pt-4">
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-muted-foreground" />
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Voorbeeld
            </Label>
          </div>
          <div
            className="overflow-hidden rounded-lg border"
            style={{ height: `${Math.min(Number(embedHeight) || 600, 500)}px` }}
          >
            <iframe
              src={embedUrl}
              width="100%"
              height="100%"
              style={{ border: "none" }}
              title="Collectie embed voorbeeld"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

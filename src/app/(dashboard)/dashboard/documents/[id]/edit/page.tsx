"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Bold,
  BookOpen,
  Check,
  Eye,
  Globe,
  Italic,
  Link2,
  List,
  Loader2,
  Lock,
  Link as LinkIcon,
  MessageSquare,
  Pencil,
  Plus,
  Settings,
  RefreshCw,
  Sparkles,
  Trash2,
  Upload,
  X,
  ImageIcon,
} from "lucide-react";
import { toast } from "sonner";
import { getTemplate } from "@/lib/templates";

interface TemplateOption {
  templateId: string;
  name: string;
  primary: string;
  headerStyle: "default" | "split-bar" | "inline-logo";
  isSystem: boolean;
}

interface DocumentData {
  _id: string;
  shortId: string;
  title: string;
  displayTitle?: string;
  authors: string[];
  publicationDate?: string;
  version?: string;
  tags: string[];
  description?: string;
  status: string;
  access: { type: string; password?: string };
  content: {
    summary: { original: string; B1: string; B2: string; C1: string };
    keyPoints: { text: string; explanation?: string; linkedTerms: string[] }[];
    findings: { category: string; title: string; content: string }[];
    terms: { term: string; definition: string; occurrences: number }[];
  };
  template?: string;
  chatMode?: "terms-only" | "terms-and-chat" | "full";
  brandOverride?: { primary?: string };
  customSlug?: string;
  coverImageUrl?: string;
  customCoverUrl?: string;
  language?: "nl" | "en";
}

// -- Rich Text Toolbar --
function RichTextToolbar({ textareaRef }: { textareaRef: React.RefObject<HTMLTextAreaElement | null> }) {
  function wrapSelection(before: string, after: string) {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const text = el.value;
    const selected = text.substring(start, end);
    const newText = text.substring(0, start) + before + selected + after + text.substring(end);
    // Trigger React onChange
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype, "value"
    )?.set;
    nativeInputValueSetter?.call(el, newText);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    // Restore cursor
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + before.length, end + before.length);
    }, 0);
  }

  function insertLink() {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = el.value.substring(start, end);
    const url = prompt("Voer de URL in:");
    if (!url) return;
    const linkText = selected || "linktekst";
    const markdown = `[${linkText}](${url})`;
    const text = el.value;
    const newText = text.substring(0, start) + markdown + text.substring(end);
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype, "value"
    )?.set;
    nativeInputValueSetter?.call(el, newText);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  }

  return (
    <div className="flex items-center gap-1 rounded-t-md border border-b-0 bg-gray-50 px-2 py-1">
      <button
        type="button"
        onClick={() => wrapSelection("**", "**")}
        className="rounded p-1.5 text-gray-600 hover:bg-gray-200 hover:text-gray-900"
        title="Vet"
      >
        <Bold className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={() => wrapSelection("*", "*")}
        className="rounded p-1.5 text-gray-600 hover:bg-gray-200 hover:text-gray-900"
        title="Cursief"
      >
        <Italic className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={insertLink}
        className="rounded p-1.5 text-gray-600 hover:bg-gray-200 hover:text-gray-900"
        title="Link invoegen"
      >
        <Link2 className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={() => wrapSelection("\n- ", "")}
        className="rounded p-1.5 text-gray-600 hover:bg-gray-200 hover:text-gray-900"
        title="Lijst"
      >
        <List className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export default function DocumentEditPage() {
  const params = useParams();
  const router = useRouter();
  const [doc, setDoc] = useState<DocumentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [reprocessing, setReprocessing] = useState(false);
  const [reprocessProgress, setReprocessProgress] = useState("");

  // Editable fields
  const [title, setTitle] = useState("");
  const [displayTitle, setDisplayTitle] = useState("");
  const [description, setDescription] = useState("");
  const [accessType, setAccessType] = useState("public");
  const [accessPassword, setAccessPassword] = useState("");
  const [summary, setSummary] = useState("");
  const [templateId, setTemplateId] = useState("doc1");
  const [templateOptions, setTemplateOptions] = useState<TemplateOption[]>([]);
  const [chatMode, setChatMode] = useState<"terms-only" | "terms-and-chat" | "full">("terms-only");
  const [language, setLanguage] = useState<"nl" | "en">("nl");
  const [customSlug, setCustomSlug] = useState("");
  const [keyPoints, setKeyPoints] = useState<{ text: string; explanation?: string; linkedTerms: string[] }[]>([]);
  const [findings, setFindings] = useState<{ category: string; title: string; content: string }[]>([]);
  const [terms, setTerms] = useState<{ term: string; definition: string; occurrences: number }[]>([]);

  // Cover image
  const [coverUploading, setCoverUploading] = useState(false);
  const coverInputRef = useRef<HTMLInputElement | null>(null);

  // Textarea refs for rich text toolbar
  const summaryRef = useRef<HTMLTextAreaElement | null>(null);

  // Track content version for auto-save triggering
  const [contentVersion, setContentVersion] = useState(0);

  // Load available templates
  useEffect(() => {
    fetch("/api/templates")
      .then((r) => r.json())
      .then(({ data }) => setTemplateOptions(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    async function fetchDoc() {
      try {
        const res = await fetch(`/api/documents/${params.id}`);
        if (!res.ok) throw new Error();
        const { data } = await res.json();
        setDoc(data);
        setTitle(data.title || "");
        setDisplayTitle(data.displayTitle || "");
        setDescription(data.description || "");
        setAccessType(data.access?.type || "public");
        setSummary(data.content?.summary?.original || "");
        setTemplateId(data.template || "doc1");
        setChatMode(data.chatMode || "terms-only");
        setLanguage(data.language || "nl");
        setCustomSlug(data.customSlug || "");
        setKeyPoints(data.content?.keyPoints || []);
        setFindings(data.content?.findings || []);
        setTerms(data.content?.terms || []);
      } catch {
        toast.error("Kon document niet laden.");
      } finally {
        setLoading(false);
      }
    }
    fetchDoc();
  }, [params.id]);

  // Auto-save with debounce
  const saveChanges = useCallback(async () => {
    if (!doc) return;
    setSaving(true);
    try {
      // Strip _id from subdocument arrays to avoid Mongoose conflicts
      const cleanKeyPoints = keyPoints.map(({ text, explanation, linkedTerms }) => ({ text, explanation, linkedTerms }));
      const cleanFindings = findings.map(({ category, title: t, content }) => ({ category, title: t, content }));
      const cleanTerms = terms.map(({ term, definition, occurrences }) => ({ term, definition, occurrences }));

      const res = await fetch(`/api/documents/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          displayTitle,
          description,
          access: { type: accessType, ...(accessType === "password" && accessPassword ? { password: accessPassword } : {}) },
          "content.summary.original": summary,
          "content.keyPoints": cleanKeyPoints,
          "content.findings": cleanFindings,
          "content.terms": cleanTerms,
          language,
          template: templateId || "doc1",
          chatMode,
          customSlug: customSlug || null,
          brandOverride: {
            primary:
              templateOptions.find((t) => t.templateId === templateId)?.primary ??
              getTemplate(templateId).primary,
          },
        }),
      });
      if (!res.ok) {
        const { error } = await res.json();
        if (error) toast.error(error);
        return;
      }
      setSaved(true);
    } catch {
      toast.error("Opslaan mislukt.");
    } finally {
      setSaving(false);
    }
  }, [params.id, doc, title, displayTitle, description, accessType, accessPassword, summary, language, templateId, templateOptions, chatMode, customSlug, keyPoints, findings, terms]);

  useEffect(() => {
    if (!doc) return;
    setSaved(false);
    const timer = setTimeout(saveChanges, 2000);
    return () => clearTimeout(timer);
  }, [title, displayTitle, description, accessType, accessPassword, summary, language, templateId, chatMode, customSlug, contentVersion, saveChanges, doc]);

  // Helper to mark content as changed (triggers auto-save for array fields)
  function markChanged() {
    setContentVersion((v) => v + 1);
  }

  async function handlePublish() {
    setPublishing(true);
    try {
      await fetch(`/api/documents/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "ready", publishedAt: new Date() }),
      });
      toast.success("Document gepubliceerd!");
      if (doc) setDoc({ ...doc, status: "ready" });
    } catch {
      toast.error("Publiceren mislukt.");
    } finally {
      setPublishing(false);
    }
  }

  const STEP_LABELS: Record<string, string> = {
    "text-extraction": "Tekst extraheren...",
    "audience-analysis": "Doelgroep analyseren...",
    "content-analysis": "Inhoud analyseren...",
    "summary-generation": "Samenvatting genereren...",
    "term-extraction": "Begrippen extraheren...",
    "cover-generation": "Cover genereren...",
    "finalizing": "Afronden...",
  };

  async function handleReprocess() {
    if (!params.id) return;
    if (!confirm("Weet je zeker dat je het document opnieuw wilt verwerken? Dit overschrijft de huidige samenvatting, hoofdpunten, bevindingen en begrippen.")) return;

    setReprocessing(true);
    setReprocessProgress("Starten...");

    try {
      const res = await fetch(`/api/documents/${params.id}/process`, { method: "POST" });
      if (!res.ok) {
        const { error } = await res.json();
        toast.error(error || "Herindexeren mislukt.");
        setReprocessing(false);
        setReprocessProgress("");
        return;
      }

      // Listen for progress via SSE
      const eventSource = new EventSource(`/api/documents/${params.id}/progress`);
      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.error) {
          toast.error(data.error);
          eventSource.close();
          setReprocessing(false);
          setReprocessProgress("");
          return;
        }
        setReprocessProgress(STEP_LABELS[data.step] || `${data.percentage}%`);
        if (data.status === "ready") {
          eventSource.close();
          setReprocessing(false);
          setReprocessProgress("");
          toast.success("Document opnieuw verwerkt!");
          // Reload document data
          fetch(`/api/documents/${params.id}`)
            .then((r) => r.json())
            .then(({ data }) => {
              setDoc(data);
              setSummary(data.content?.summary?.original || "");
              setKeyPoints(data.content?.keyPoints || []);
              setFindings(data.content?.findings || []);
              setTerms(data.content?.terms || []);
            });
        } else if (data.status === "error") {
          eventSource.close();
          setReprocessing(false);
          setReprocessProgress("");
          toast.error("Verwerking mislukt.");
        }
      };
      eventSource.onerror = () => {
        eventSource.close();
        setReprocessing(false);
        setReprocessProgress("");
      };
    } catch {
      toast.error("Herindexeren mislukt.");
      setReprocessing(false);
      setReprocessProgress("");
    }
  }

  // -- Cover Image --
  async function handleCoverUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !params.id) return;
    setCoverUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`/api/documents/${params.id}/cover`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const { error } = await res.json();
        toast.error(error || "Upload mislukt.");
        return;
      }
      const { data } = await res.json();
      setDoc((prev) => prev ? { ...prev, customCoverUrl: data.customCoverUrl } : prev);
      toast.success("Coverafbeelding geüpload!");
    } catch {
      toast.error("Kon coverafbeelding niet uploaden.");
    } finally {
      setCoverUploading(false);
      if (coverInputRef.current) coverInputRef.current.value = "";
    }
  }

  async function handleCoverRemove() {
    if (!params.id) return;
    setCoverUploading(true);
    try {
      const res = await fetch(`/api/documents/${params.id}/cover`, { method: "DELETE" });
      if (!res.ok) {
        toast.error("Kon coverafbeelding niet verwijderen.");
        return;
      }
      setDoc((prev) => prev ? { ...prev, customCoverUrl: undefined } : prev);
      toast.success("Standaard cover hersteld.");
    } catch {
      toast.error("Kon coverafbeelding niet verwijderen.");
    } finally {
      setCoverUploading(false);
    }
  }

  // -- Key Points CRUD --
  const [generatingExplanation, setGeneratingExplanation] = useState<Record<number, boolean>>({});

  async function generateExplanation(index: number) {
    const kp = keyPoints[index];
    if (!kp?.text || !params.id) return;
    setGeneratingExplanation((prev) => ({ ...prev, [index]: true }));
    try {
      const res = await fetch(`/api/documents/${params.id}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `Geef een korte uitleg van 2-3 zinnen die meer context en achtergrond geeft over het volgende hoofdpunt uit het document: "${kp.text}". Geef alleen de uitleg, geen inleiding of herhaling van het hoofdpunt.`,
        }),
      });
      if (!res.ok) throw new Error();
      const { data } = await res.json();
      if (data?.response) {
        updateKeyPoint(index, "explanation", data.response);
      }
    } catch {
      toast.error("Kon uitleg niet genereren.");
    } finally {
      setGeneratingExplanation((prev) => ({ ...prev, [index]: false }));
    }
  }

  async function generateAllExplanations() {
    const indices = keyPoints
      .map((kp, i) => (!kp.explanation && kp.text ? i : -1))
      .filter((i) => i !== -1);
    for (const i of indices) {
      await generateExplanation(i);
    }
  }

  function updateKeyPoint(index: number, field: "text" | "explanation", value: string) {
    setKeyPoints((prev) => prev.map((kp, i) => (i === index ? { ...kp, [field]: value } : kp)));
    markChanged();
  }
  function removeKeyPoint(index: number) {
    setKeyPoints((prev) => prev.filter((_, i) => i !== index));
    markChanged();
  }
  function addKeyPoint() {
    setKeyPoints((prev) => [...prev, { text: "", linkedTerms: [] }]);
    markChanged();
  }

  // -- Findings CRUD --
  function updateFinding(index: number, field: "category" | "title" | "content", value: string) {
    setFindings((prev) => prev.map((f, i) => (i === index ? { ...f, [field]: value } : f)));
    markChanged();
  }
  function removeFinding(index: number) {
    setFindings((prev) => prev.filter((_, i) => i !== index));
    markChanged();
  }
  function addFinding() {
    setFindings((prev) => [...prev, { category: "", title: "", content: "" }]);
    markChanged();
  }

  // -- Terms CRUD --
  function updateTerm(index: number, field: "term" | "definition", value: string) {
    setTerms((prev) => prev.map((t, i) => (i === index ? { ...t, [field]: value } : t)));
    markChanged();
  }
  function updateTermOccurrences(index: number, value: number) {
    setTerms((prev) => prev.map((t, i) => (i === index ? { ...t, occurrences: value } : t)));
    markChanged();
  }
  function removeTerm(index: number) {
    setTerms((prev) => prev.filter((_, i) => i !== index));
    markChanged();
  }
  function addTerm() {
    setTerms((prev) => [...prev, { term: "", definition: "", occurrences: 0 }]);
    markChanged();
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-80" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!doc) return null;

  return (
    <div className="space-y-4">
      {/* Top bar */}
      <div className="flex items-center justify-between rounded-lg border bg-white p-3">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/dashboard/documents")}
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Dashboard
          </Button>
          <Separator orientation="vertical" className="h-6" />
          <span className="font-medium">Document Bewerken</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-sm text-muted-foreground">
            {saving ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : saved ? (
              <Check className="h-3 w-3 text-green-500" />
            ) : null}
            {saving ? "Opslaan..." : saved ? "Opgeslagen" : "Niet opgeslagen"}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleReprocess}
            disabled={reprocessing}
          >
            {reprocessing ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-1 h-4 w-4" />
            )}
            {reprocessing ? reprocessProgress : "Herindexeren"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(`/${doc.shortId}?v=${Date.now()}`, "_blank")}
          >
            <Eye className="mr-1 h-4 w-4" />
            Voorbeeld
          </Button>
          <Button
            size="sm"
            className="bg-primary hover:bg-primary/90"
            onClick={handlePublish}
            disabled={publishing}
          >
            {publishing && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
            Publiceren
          </Button>
        </div>
      </div>

      {/* Tab-based layout */}
      <Tabs defaultValue="intelligentie" className="w-full">
        <TabsList variant="line" className="w-full justify-start border-b px-0">
          <TabsTrigger value="intelligentie" className="gap-1.5">
            <Settings className="h-3.5 w-3.5" />
            Intelligentie
          </TabsTrigger>
          <TabsTrigger value="samenvatting" className="gap-1.5">
            <Pencil className="h-3.5 w-3.5" />
            Samenvatting
          </TabsTrigger>
          <TabsTrigger value="definities" className="gap-1.5">
            <BookOpen className="h-3.5 w-3.5" />
            Begrippen & Definities
          </TabsTrigger>
        </TabsList>

        {/* Intelligentie Tab */}
        <TabsContent value="intelligentie">
          <div className="mx-auto max-w-4xl space-y-6 py-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Instellingen</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Documentnaam</Label>
                      <Input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                      />
                      <p className="text-[10px] text-muted-foreground">
                        De originele naam van het document
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label>Paginatitel</Label>
                      <Input
                        value={displayTitle}
                        onChange={(e) => setDisplayTitle(e.target.value)}
                        placeholder="Communicatieve titel voor de lezer..."
                      />
                      <p className="text-[10px] text-muted-foreground">
                        De titel die bezoekers zien in de header. Wordt automatisch gegenereerd, maar is aanpasbaar.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label>Beschrijving</Label>
                      <Textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={3}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Auteur(s)</Label>
                      <div className="flex flex-wrap gap-1">
                        {doc.authors?.map((a, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {a}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Tags</Label>
                      <div className="flex flex-wrap gap-1">
                        {doc.tags?.map((t, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {t}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Taal verwerking</Label>
                      <div className="flex items-center gap-3">
                        <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
                        <Select value={language} onValueChange={(v) => setLanguage(v as "nl" | "en")}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="nl">Nederlands</SelectItem>
                            <SelectItem value="en">Engels</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        Wijzig de taal en herindexeer om opnieuw te verwerken
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>Toegang</Label>
                      <Select value={accessType} onValueChange={setAccessType}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="public">
                            <div className="flex items-center gap-2">
                              <Globe className="h-3 w-3" /> Openbaar
                            </div>
                          </SelectItem>
                          <SelectItem value="link-only">
                            <div className="flex items-center gap-2">
                              <LinkIcon className="h-3 w-3" /> Alleen via link
                            </div>
                          </SelectItem>
                          <SelectItem value="password">
                            <div className="flex items-center gap-2">
                              <Lock className="h-3 w-3" /> Wachtwoord
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      {accessType === "password" && (
                        <Input
                          type="password"
                          placeholder="Voer wachtwoord in"
                          value={accessPassword}
                          onChange={(e) => setAccessPassword(e.target.value)}
                          className="mt-2"
                        />
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label>Sjabloon</Label>
                      <div className="grid grid-cols-1 gap-2">
                        {templateOptions.length === 0 && (
                          <p className="text-[10px] text-muted-foreground">Sjablonen laden...</p>
                        )}
                        {templateOptions.map((tmpl) => (
                          <button
                            key={tmpl.templateId}
                            onClick={() => setTemplateId(tmpl.templateId)}
                            className={`flex items-center gap-3 rounded-lg border p-2.5 text-left text-xs transition-all ${
                              templateId === tmpl.templateId
                                ? "border-primary ring-2 ring-primary/20"
                                : "hover:border-gray-400"
                            }`}
                          >
                            <div
                              className="h-8 w-8 flex-shrink-0 rounded"
                              style={{ backgroundColor: tmpl.primary }}
                            />
                            <div>
                              <div className="font-medium">{tmpl.name}</div>
                              <div className="text-[10px] text-muted-foreground">
                                {tmpl.headerStyle === "split-bar"
                                  ? "Logo + titelbalk"
                                  : tmpl.headerStyle === "inline-logo"
                                  ? "Logo + titel inline"
                                  : "Standaard header"}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <Label>AI Assistent modus</Label>
                      <Select value={chatMode} onValueChange={(v: "terms-only" | "terms-and-chat" | "full") => setChatMode(v)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="terms-only">
                            <div className="flex items-center gap-2">
                              <BookOpen className="h-3 w-3" /> Alleen begrippen
                            </div>
                          </SelectItem>
                          <SelectItem value="terms-and-chat">
                            <div className="flex items-center gap-2">
                              <MessageSquare className="h-3 w-3" /> Begrippen + vragen
                            </div>
                          </SelectItem>
                          <SelectItem value="full">
                            <div className="flex items-center gap-2">
                              <MessageSquare className="h-3 w-3" /> Volledig AI
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-[10px] text-muted-foreground">
                        {chatMode === "terms-only"
                          ? "Gebruikers zien alleen voorgedefinieerde begrippen, geen vrije vragen"
                          : chatMode === "terms-and-chat"
                            ? "Begrippen uit de lijst bij klik, plus vrije vragen aan de AI"
                            : "AI genereert antwoorden voor begrippen en vragen"}
                      </p>
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <Label>Custom URL</Label>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground whitespace-nowrap">/</span>
                        <Input
                          value={customSlug}
                          onChange={(e) => setCustomSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
                          placeholder={doc.shortId}
                          className="text-xs"
                        />
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        Optioneel. Laat leeg om de standaard ID te gebruiken.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>Deellink</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          readOnly
                          value={`${process.env.NEXT_PUBLIC_SITE_URL || ""}/${customSlug || doc.shortId}`}
                          className="text-xs"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            navigator.clipboard.writeText(
                              `${window.location.origin}/${customSlug || doc.shortId}`
                            );
                            toast.success("Link gekopieerd!");
                          }}
                        >
                          Kopieer
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Cover Image */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <ImageIcon className="h-3.5 w-3.5 text-muted-foreground" />
                  Coverafbeelding
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Current cover preview */}
                  <div className="overflow-hidden rounded-lg border bg-gray-50">
                    {(doc.customCoverUrl || doc.coverImageUrl) ? (
                      <img
                        src={doc.customCoverUrl || doc.coverImageUrl}
                        alt="Cover"
                        className="w-full h-auto max-h-[300px] object-contain"
                      />
                    ) : (
                      <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
                        Geen cover beschikbaar
                      </div>
                    )}
                  </div>

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
                      {doc.customCoverUrl ? "Cover vervangen" : "Custom cover uploaden"}
                    </Button>
                    {doc.customCoverUrl && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCoverRemove}
                        disabled={coverUploading}
                        className="text-muted-foreground hover:text-red-500"
                      >
                        <X className="mr-1 h-3.5 w-3.5" />
                        Standaard herstellen
                      </Button>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Upload een JPG, PNG of WebP (max 5MB). Zonder custom cover wordt de eerste pagina van de PDF gebruikt.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Samenvatting Tab */}
        <TabsContent value="samenvatting">
          <div className="mx-auto max-w-4xl space-y-4 py-6">
            {/* Samenvatting */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                  Samenvatting
                </CardTitle>
              </CardHeader>
              <CardContent>
                <RichTextToolbar textareaRef={summaryRef} />
                <Textarea
                  ref={summaryRef}
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  rows={8}
                  className="resize-none rounded-t-none"
                />
              </CardContent>
            </Card>

            {/* Hoofdpunten */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                    Hoofdpunten
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={generateAllExplanations}
                      className="h-7 text-xs"
                      disabled={keyPoints.every((kp) => kp.explanation || !kp.text)}
                    >
                      <Sparkles className="mr-1 h-3 w-3" />
                      Genereer uitleg
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={addKeyPoint}
                      className="h-7 text-xs"
                    >
                      <Plus className="mr-1 h-3 w-3" />
                      Toevoegen
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {keyPoints.map((kp, i) => (
                    <li key={i} className="space-y-1.5">
                      <div className="flex items-start gap-2">
                        <Check className="mt-2.5 h-4 w-4 flex-shrink-0 text-primary" />
                        <Input
                          value={kp.text}
                          onChange={(e) => updateKeyPoint(i, "text", e.target.value)}
                          placeholder="Hoofdpunt..."
                          className="flex-1 text-sm"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 flex-shrink-0 text-muted-foreground hover:text-red-500"
                          onClick={() => removeKeyPoint(i)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <div className="pl-6 flex gap-2">
                        <Textarea
                          value={kp.explanation || ""}
                          onChange={(e) => updateKeyPoint(i, "explanation", e.target.value)}
                          placeholder="Uitleg (2-3 zinnen met meer context)..."
                          className="text-xs min-h-[3rem] resize-none flex-1"
                          rows={2}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 flex-shrink-0 text-muted-foreground hover:text-primary"
                          onClick={() => generateExplanation(i)}
                          disabled={generatingExplanation[i] || !kp.text}
                          title="Genereer uitleg met AI"
                        >
                          {generatingExplanation[i] ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Sparkles className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </div>
                    </li>
                  ))}
                  {keyPoints.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      Geen hoofdpunten. Klik op &quot;Toevoegen&quot; om er een toe te voegen.
                    </p>
                  )}
                </ul>
              </CardContent>
            </Card>

            {/* Belangrijke Bevindingen */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                    Belangrijke Bevindingen
                  </CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={addFinding}
                    className="h-7 text-xs"
                  >
                    <Plus className="mr-1 h-3 w-3" />
                    Toevoegen
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  {findings.map((f, i) => (
                    <div key={i} className="rounded-lg border p-3 space-y-2 relative group">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-red-500"
                        onClick={() => removeFinding(i)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                      <Input
                        value={f.category}
                        onChange={(e) => updateFinding(i, "category", e.target.value)}
                        placeholder="Categorie"
                        className="h-7 text-xs"
                      />
                      <Input
                        value={f.title}
                        onChange={(e) => updateFinding(i, "title", e.target.value)}
                        placeholder="Titel"
                        className="text-sm font-medium"
                      />
                      <Textarea
                        value={f.content}
                        onChange={(e) => updateFinding(i, "content", e.target.value)}
                        placeholder="Inhoud..."
                        rows={2}
                        className="resize-none text-xs"
                      />
                    </div>
                  ))}
                  {findings.length === 0 && (
                    <p className="col-span-2 text-sm text-muted-foreground">
                      Geen bevindingen. Klik op &quot;Toevoegen&quot; om er een toe te voegen.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Begrippen & Definities Tab */}
        <TabsContent value="definities">
          <div className="mx-auto max-w-5xl py-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
                    Begrippen & Definities
                  </CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={addTerm}
                    className="h-7 text-xs"
                  >
                    <Plus className="mr-1 h-3 w-3" />
                    Nieuw
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {terms.map((t, i) => (
                    <div key={i} className="rounded-lg bg-gray-50 p-4 space-y-2 relative group">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-red-500"
                        onClick={() => removeTerm(i)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                      <div className="flex items-center gap-2">
                        <Input
                          value={t.term}
                          onChange={(e) => updateTerm(i, "term", e.target.value)}
                          placeholder="Begrip"
                          className="flex-1 text-sm font-medium text-primary h-8"
                        />
                        <Input
                          type="number"
                          value={t.occurrences}
                          onChange={(e) => updateTermOccurrences(i, parseInt(e.target.value) || 0)}
                          className="w-14 text-xs text-center h-8"
                          title="Voorkomens"
                          min={0}
                        />
                      </div>
                      <Textarea
                        value={t.definition}
                        onChange={(e) => updateTerm(i, "definition", e.target.value)}
                        placeholder="Definitie..."
                        rows={2}
                        className="resize-none text-xs"
                      />
                    </div>
                  ))}
                  {terms.length === 0 && (
                    <p className="col-span-full text-sm text-muted-foreground">
                      Geen begrippen. Klik op &quot;Nieuw&quot; om er een toe te voegen.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

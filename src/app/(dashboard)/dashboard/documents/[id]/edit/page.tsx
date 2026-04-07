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
  Code,
  Copy,
  Eye,
  ExternalLink,
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
  Info,
  GitBranch,
} from "lucide-react";
import { toast } from "sonner";
import { getTemplate } from "@/lib/templates";
import VersionHistory from "@/components/documents/VersionHistory";
import CoverBuilder from "@/components/documents/cover-builder/CoverBuilder";
import TextToSpeech from "@/components/reader/TextToSpeech";
import type { ICoverDesign } from "@/components/documents/cover-builder/types";

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
  coverDesign?: ICoverDesign;
  ttsAudioUrl?: string;
  language?: "nl" | "en";
  languageLevel?: "B1" | "B2" | "C1" | "C2";
  targetCEFRLevel?: "B1" | "B2" | "C1" | "C2";
  pageCount?: number;
  pageLabelOffset?: number;
  pageImages?: { pageNumber: number; url: string }[];
  visualContentExtracted?: boolean;
  visualChunkCount?: number;
  visualContent?: {
    pageNumber: number;
    contentType: "table" | "chart" | "diagram" | "image-with-text";
    description: string;
  }[];
  isDraft?: boolean;
  scheduledPublishAt?: string;
  publishedAt?: string;
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
  const initialLoadRef = useRef(true);

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
  const [infoBoxLabel, setInfoBoxLabel] = useState("");
  const [infoBoxText, setInfoBoxText] = useState("");
  const [keyPoints, setKeyPoints] = useState<{ text: string; explanation?: string; linkedTerms: string[] }[]>([]);
  const [findings, setFindings] = useState<{ category: string; title: string; content: string }[]>([]);
  const [terms, setTerms] = useState<{ term: string; definition: string; occurrences: number }[]>([]);
  const [authors, setAuthors] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [newAuthor, setNewAuthor] = useState("");
  const [newTag, setNewTag] = useState("");
  const [targetCEFRLevel, setTargetCEFRLevel] = useState<"B1" | "B2" | "C1" | "C2" | "">("");
  const [isDraft, setIsDraft] = useState(false);
  const [scheduledPublishAt, setScheduledPublishAt] = useState("");
  const [discussionsEnabled, setDiscussionsEnabled] = useState(false);
  const [chatSuggestions, setChatSuggestions] = useState<string[]>([]);
  const [chatSuggestionInput, setChatSuggestionInput] = useState("");
  const [precaching, setPrecaching] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [showAllPages, setShowAllPages] = useState(false);

  // Cover image
  const [coverUploading, setCoverUploading] = useState(false);
  const coverInputRef = useRef<HTMLInputElement | null>(null);

  // Organization data for cover builder
  const [orgData, setOrgData] = useState<{ name: string; logo?: string; brandPrimary: string }>({
    name: "Organisatie",
    brandPrimary: "#0062EB",
  });

  // Textarea refs for rich text toolbar
  const summaryRef = useRef<HTMLTextAreaElement | null>(null);

  // Track content version for auto-save triggering
  const [contentVersion, setContentVersion] = useState(0);

  // Load available templates + org data
  useEffect(() => {
    fetch("/api/templates")
      .then((r) => r.json())
      .then(({ data }) => setTemplateOptions(data))
      .catch(() => {});
    fetch("/api/organizations")
      .then((r) => r.json())
      .then(({ data }) => {
        if (data) {
          setOrgData({
            name: data.name || "Organisatie",
            logo: data.logo,
            brandPrimary: data.brandColors?.primary || "#0062EB",
          });
        }
      })
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
        setInfoBoxLabel(data.infoBoxLabel || "");
        setInfoBoxText(data.infoBoxText || "");
        setKeyPoints(data.content?.keyPoints || []);
        setFindings(data.content?.findings || []);
        setTerms(data.content?.terms || []);
        setAuthors(data.authors || []);
        setTags(data.tags || []);
        setTargetCEFRLevel(data.targetCEFRLevel || "");
        setIsDraft(data.isDraft || false);
        setScheduledPublishAt(data.scheduledPublishAt ? new Date(data.scheduledPublishAt).toISOString().slice(0, 16) : "");
        setDiscussionsEnabled(data.discussionsEnabled || false);
        setChatSuggestions(data.chatSuggestions || []);
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

      const payload = {
          title,
          displayTitle,
          description,
          access: { type: accessType, ...(accessType === "password" && accessPassword ? { password: accessPassword } : {}) },
          "content.summary.original": summary,
          "content.keyPoints": cleanKeyPoints,
          "content.findings": cleanFindings,
          "content.terms": cleanTerms,
          language,
          authors,
          tags,
          targetCEFRLevel: targetCEFRLevel || null,
          template: templateId || "doc1",
          chatMode,
          chatSuggestions,
          discussionsEnabled,
          customSlug: customSlug || null,
          isDraft,
          scheduledPublishAt: scheduledPublishAt ? new Date(scheduledPublishAt).toISOString() : null,
          infoBoxLabel: infoBoxLabel || null,
          infoBoxText: infoBoxText || null,
          pageLabelOffset: doc?.pageLabelOffset ?? 0,
          brandOverride: {
            primary:
              templateOptions.find((t) => t.templateId === templateId)?.primary ??
              getTemplate(templateId).primary,
          },
        };
      const res = await fetch(`/api/documents/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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
  }, [params.id, doc, title, displayTitle, description, accessType, accessPassword, summary, language, templateId, templateOptions, chatMode, chatSuggestions, discussionsEnabled, customSlug, infoBoxLabel, infoBoxText, keyPoints, findings, terms, authors, tags, targetCEFRLevel, isDraft, scheduledPublishAt]);

  useEffect(() => {
    if (!doc) return;
    // Skip auto-save on initial data load
    if (initialLoadRef.current) {
      initialLoadRef.current = false;
      return;
    }
    setSaved(false);
    const timer = setTimeout(saveChanges, 2000);
    return () => clearTimeout(timer);
  }, [title, displayTitle, description, accessType, accessPassword, summary, language, templateId, chatMode, chatSuggestions, discussionsEnabled, customSlug, infoBoxLabel, infoBoxText, contentVersion, authors, tags, targetCEFRLevel, isDraft, scheduledPublishAt, saveChanges, doc]);

  // Warn user if they try to leave with unsaved changes
  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (!saved) {
        e.preventDefault();
      }
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [saved]);

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
        body: JSON.stringify({ status: "ready", publishedAt: new Date(), isDraft: false }),
      });
      toast.success("Document gepubliceerd!");
      setIsDraft(false);
      setScheduledPublishAt("");
      if (doc) setDoc({ ...doc, status: "ready", isDraft: false, scheduledPublishAt: undefined });
    } catch {
      toast.error("Publiceren mislukt.");
    } finally {
      setPublishing(false);
    }
  }

  const STEP_LABELS: Record<string, string> = {
    "text-extraction": "Tekst extraheren...",
    "visual-extraction": "Visuele content extraheren...",
    "vectorization": "Document vectoriseren...",
    "audience-analysis": "Doelgroep analyseren...",
    "content-analysis": "Inhoud analyseren...",
    "summary-generation": "Samenvatting genereren...",
    "language-levels": "Taalniveaus genereren...",
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
          <span className="font-medium">Document bewerken</span>
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
            onClick={() => window.open(`/${customSlug || doc.customSlug || doc.shortId}?v=${Date.now()}`, "_blank")}
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
      <Tabs defaultValue="inhoud" className="w-full">
        <TabsList variant="line" className="w-full justify-start border-b px-0">
          <TabsTrigger value="inhoud" className="gap-1.5">
            <Pencil className="h-3.5 w-3.5" />
            Inhoud
          </TabsTrigger>
          <TabsTrigger value="vormgeving" className="gap-1.5">
            <ImageIcon className="h-3.5 w-3.5" />
            Vormgeving
          </TabsTrigger>
          <TabsTrigger value="instellingen" className="gap-1.5">
            <Settings className="h-3.5 w-3.5" />
            Instellingen
          </TabsTrigger>
          <TabsTrigger value="versies" className="gap-1.5">
            <GitBranch className="h-3.5 w-3.5" />
            Versies
          </TabsTrigger>
        </TabsList>

        {/* ===== INHOUD TAB ===== */}
        <TabsContent value="inhoud">
          <div className="mx-auto max-w-4xl space-y-4 py-6">
            {/* Samenvatting */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                    Samenvatting
                  </CardTitle>
                  <TextToSpeech
                    text={summary}
                    shortId={doc.shortId}
                    ttsAudioUrl={doc.ttsAudioUrl}
                    labels={{
                      ttsPlay: "Voorlezen",
                      ttsPlaying: "Aan het voorlezen...",
                      ttsPause: "Pauzeren",
                      ttsResume: "Hervatten",
                      ttsStop: "Stoppen",
                      ttsUnsupported: "Voorlezen wordt niet ondersteund in deze browser.",
                    }}
                  />
                </div>
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

            {/* Begrippen & definities */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
                    Begrippen & definities
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

            {/* Visuele Content */}
            {doc.pageImages && doc.pageImages.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <ImageIcon className="h-4 w-4" />
                    Visuele Content
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    {doc.visualContent && doc.visualContent.length > 0
                      ? `${doc.visualContent.length} visuele elementen gedetecteerd op ${new Set(doc.visualContent.map((vc) => vc.pageNumber)).size} pagina's`
                      : `${doc.pageImages.length} pagina's`}
                  </p>
                </CardHeader>
                <CardContent>
                  <div className={`grid gap-3 ${doc.visualContent && doc.visualContent.length > 0 ? "grid-cols-3 sm:grid-cols-4 lg:grid-cols-5" : "grid-cols-4 sm:grid-cols-5 lg:grid-cols-6 gap-2"}`}>
                    {(() => {
                      const hasVisualContent = doc.visualContent && doc.visualContent.length > 0;
                      // pageImages[i].url contains the physical page number in the filename.
                      // visualContent.pageNumber = physical page (1-based, stored without offset).
                      // We match by extracting the physical page from the URL.
                      const getPhysicalPage = (url: string) => {
                        const m = url.match(/page-(\d+)\.png/);
                        return m ? parseInt(m[1], 10) : 0;
                      };
                      const visualPhysicalPages = new Set(
                        doc.visualContent?.map((vc) => vc.pageNumber) || []
                      );
                      const pagesToShow = hasVisualContent
                        ? doc.pageImages!.filter((pi) => {
                            const physical = getPhysicalPage(pi.url);
                            return visualPhysicalPages.has(physical);
                          })
                        : doc.pageImages!;
                      const displayPages = showAllPages ? pagesToShow : pagesToShow.slice(0, hasVisualContent ? 20 : 24);
                      return displayPages.map((pi) => {
                        const physical = getPhysicalPage(pi.url);
                        const visuals = doc.visualContent?.filter((vc) =>
                          vc.pageNumber === physical
                        );
                        const hasVisual = visuals && visuals.length > 0;
                        const typeEmoji = visuals?.[0]?.contentType === "table" ? "📊" : visuals?.[0]?.contentType === "chart" ? "📈" : visuals?.[0]?.contentType === "diagram" ? "🔀" : visuals?.[0]?.contentType === "image-with-text" ? "🖼️" : "";
                        const typeLabel = visuals?.[0]?.contentType === "table" ? "Tabel" : visuals?.[0]?.contentType === "chart" ? "Grafiek" : visuals?.[0]?.contentType === "diagram" ? "Diagram" : visuals?.[0]?.contentType === "image-with-text" ? "Afbeelding" : "";
                        return (
                          <button
                            key={pi.pageNumber}
                            onClick={() => setLightboxUrl(pi.url)}
                            className={`group relative overflow-hidden rounded-lg border transition-all hover:shadow-md ${
                              hasVisual ? "border-primary/40 ring-1 ring-primary/20" : "border-gray-200 hover:border-gray-400"
                            }`}
                            title={hasVisual ? visuals!.map((v) => v.description).join("\n") : `Pagina ${pi.pageNumber}`}
                          >
                            <img
                              src={pi.url}
                              alt={`Pagina ${pi.pageNumber}`}
                              className="w-full aspect-[3/4] object-cover bg-gray-50"
                              loading="lazy"
                            />
                            {/* Page number badge */}
                            <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">
                              {pi.pageNumber}
                            </span>
                            {/* Content type badge for visual pages */}
                            {hasVisual && (
                              <span className="absolute top-1 right-1 rounded bg-primary/90 px-1.5 py-0.5 text-[10px] text-white whitespace-nowrap">
                                {typeEmoji} {typeLabel}{visuals!.length > 1 ? ` +${visuals!.length - 1}` : ""}
                              </span>
                            )}
                            {/* Description overlay on hover */}
                            {hasVisual && (
                              <div className="absolute inset-x-0 bottom-0 translate-y-full group-hover:translate-y-0 transition-transform bg-black/75 px-2 py-1.5">
                                <p className="text-[10px] leading-tight text-white line-clamp-3">
                                  {visuals!.map((v) => v.description).join("; ")}
                                </p>
                              </div>
                            )}
                          </button>
                        );
                      });
                    })()}
                  </div>
                  {!showAllPages && (() => {
                    const hasVisualContent = doc.visualContent && doc.visualContent.length > 0;
                    const totalPages = hasVisualContent
                      ? new Set(doc.visualContent!.map((vc) => vc.pageNumber)).size
                      : doc.pageImages!.length;
                    const limit = hasVisualContent ? 20 : 24;
                    return totalPages > limit ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-3 w-full"
                        onClick={() => setShowAllPages(true)}
                      >
                        Toon alle {totalPages} pagina&apos;s
                      </Button>
                    ) : null;
                  })()}
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* ===== VORMGEVING TAB ===== */}
        <TabsContent value="vormgeving">
          <div className="mx-auto max-w-4xl space-y-6 py-6">
            {/* Voorblad */}
            <CoverBuilder
              documentId={doc._id}
              title={title || doc.title}
              tags={tags}
              orgName={orgData.name}
              orgLogo={orgData.logo}
              brandPrimary={doc.brandOverride?.primary || orgData.brandPrimary}
              initialDesign={doc.coverDesign}
              coverImageUrl={doc.coverImageUrl}
              customCoverUrl={doc.customCoverUrl}
              onCoverSaved={(url) =>
                setDoc((prev) => (prev ? { ...prev, customCoverUrl: url } : prev))
              }
              onCoverUploaded={(url) =>
                setDoc((prev) => (prev ? { ...prev, customCoverUrl: url } : prev))
              }
              onCoverRemoved={() =>
                setDoc((prev) => (prev ? { ...prev, customCoverUrl: undefined } : prev))
              }
            />

            {/* Sjabloon */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Sjabloon</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
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
              </CardContent>
            </Card>

            {/* Informatiebox */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-1.5">
                  <Info className="h-3.5 w-3.5 text-muted-foreground" />
                  Informatiebox
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <Input
                    value={infoBoxLabel}
                    onChange={(e) => setInfoBoxLabel(e.target.value)}
                    placeholder="Meer informatie"
                    className="text-xs"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Koptekst van de informatiebox onderaan de pagina. Laat leeg om te verbergen.
                  </p>
                </div>
                {infoBoxLabel && (
                  <Textarea
                    value={infoBoxText}
                    onChange={(e) => setInfoBoxText(e.target.value)}
                    placeholder="Voor volledige details en uitvoeringsplannen, zie het oorspronkelijke document."
                    rows={2}
                    className="text-xs"
                  />
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ===== INSTELLINGEN TAB ===== */}
        <TabsContent value="instellingen">
          <div className="mx-auto max-w-4xl space-y-6 py-6">
            {/* Document metadata */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Document</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
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
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Auteur(s)</Label>
                      <div className="flex flex-wrap gap-1.5">
                        {authors.map((a, i) => (
                          <Badge key={i} variant="secondary" className="text-xs flex items-center gap-1">
                            {a}
                            <button
                              type="button"
                              onClick={() => setAuthors(authors.filter((_, j) => j !== i))}
                              className="ml-0.5 hover:text-destructive"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Input
                          value={newAuthor}
                          onChange={(e) => setNewAuthor(e.target.value)}
                          placeholder="Naam toevoegen..."
                          className="text-sm"
                          autoComplete="off"
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && newAuthor.trim()) {
                              e.preventDefault();
                              setAuthors([...authors, newAuthor.trim()]);
                              setNewAuthor("");
                            }
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          disabled={!newAuthor.trim()}
                          onClick={() => {
                            setAuthors([...authors, newAuthor.trim()]);
                            setNewAuthor("");
                          }}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Tags</Label>
                      <div className="flex flex-wrap gap-1.5">
                        {tags.map((t, i) => (
                          <Badge key={i} variant="outline" className="text-xs flex items-center gap-1">
                            {t}
                            <button
                              type="button"
                              onClick={() => setTags(tags.filter((_, j) => j !== i))}
                              className="ml-0.5 hover:text-destructive"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Input
                          value={newTag}
                          onChange={(e) => setNewTag(e.target.value)}
                          placeholder="Tag toevoegen..."
                          className="text-sm"
                          autoComplete="off"
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && newTag.trim()) {
                              e.preventDefault();
                              setTags([...tags, newTag.trim()]);
                              setNewTag("");
                            }
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          disabled={!newTag.trim()}
                          onClick={() => {
                            setTags([...tags, newTag.trim()]);
                            setNewTag("");
                          }}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    {(doc.publicationDate || doc.pageCount || doc.languageLevel) && (
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        {doc.publicationDate && (
                          <span>
                            {new Date(doc.publicationDate).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" })}
                          </span>
                        )}
                        {doc.publicationDate && doc.pageCount && <span>·</span>}
                        {doc.pageCount && <span>{doc.pageCount} pag.</span>}
                        {(doc.publicationDate || doc.pageCount) && doc.languageLevel && <span>·</span>}
                        {doc.languageLevel && (
                          <Badge variant="secondary" className="text-[10px] font-medium">
                            CEFR {doc.languageLevel}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Taal & AI */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Taal & AI</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-6">
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
                      <Label>Doelniveau (CEFR)</Label>
                      <Select value={targetCEFRLevel || "auto"} onValueChange={(v) => setTargetCEFRLevel(v === "auto" ? "" : v as "B1" | "B2" | "C1" | "C2")}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="auto">Automatisch</SelectItem>
                          <SelectItem value="B1">B1 — Eenvoudig</SelectItem>
                          <SelectItem value="B2">B2 — Gemiddeld</SelectItem>
                          <SelectItem value="C1">C1 — Geavanceerd</SelectItem>
                          <SelectItem value="C2">C2 — Academisch</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-[10px] text-muted-foreground">
                        Op welk taalniveau moeten de samenvatting, begrippen en bevindingen worden geschreven? Herindexeer na wijziging.
                      </p>
                    </div>
                    {doc.pageCount && doc.pageCount > 0 && (
                      <div className="space-y-2">
                        <Label>Paginanummering start</Label>
                        <Select
                          value={String(doc.pageLabelOffset ?? 0)}
                          onValueChange={(v) => {
                            const offset = parseInt(v, 10);
                            setDoc({ ...doc, pageLabelOffset: offset });
                            setSaved(false);
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0">Pagina 1 = eerste pagina</SelectItem>
                            <SelectItem value="1">Pagina 1 = tweede pagina (voorblad)</SelectItem>
                            <SelectItem value="2">Pagina 1 = derde pagina</SelectItem>
                            <SelectItem value="3">Pagina 1 = vierde pagina</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-[10px] text-muted-foreground">
                          Heeft het PDF een voorblad? Stel in op welke fysieke pagina de nummering begint. Herindexeer na wijziging.
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="space-y-4">
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
                    {(chatMode === "terms-and-chat" || chatMode === "full") && (
                      <div className="space-y-2">
                        <Label>Startvragen voor chat</Label>
                        <p className="text-[10px] text-muted-foreground">
                          Klikbare suggesties die bezoekers zien in de chat widget
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {chatSuggestions.map((q, i) => (
                            <Badge key={i} variant="secondary" className="gap-1 text-xs">
                              {q}
                              <button
                                type="button"
                                onClick={() => setChatSuggestions(chatSuggestions.filter((_, j) => j !== i))}
                                className="ml-0.5 hover:text-destructive"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <Input
                            value={chatSuggestionInput}
                            onChange={(e) => setChatSuggestionInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && chatSuggestionInput.trim()) {
                                e.preventDefault();
                                setChatSuggestions([...chatSuggestions, chatSuggestionInput.trim()]);
                                setChatSuggestionInput("");
                              }
                            }}
                            placeholder="Typ een suggestievraag…"
                            className="text-xs"
                          />
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={!chatSuggestionInput.trim()}
                            onClick={() => {
                              setChatSuggestions([...chatSuggestions, chatSuggestionInput.trim()]);
                              setChatSuggestionInput("");
                            }}
                          >
                            <Plus className="h-3 w-3 mr-1" /> Toevoegen
                          </Button>
                        </div>
                        {chatSuggestions.length > 0 && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={precaching}
                            onClick={async () => {
                              setPrecaching(true);
                              try {
                                const res = await fetch(`/api/documents/${params.id}/precache-chat`, { method: "POST" });
                                const { data, error } = await res.json();
                                if (error) { toast.error(error); return; }
                                toast.success(`${data.cached} antwoorden vooraf gegenereerd`);
                              } catch {
                                toast.error("Pre-analyse mislukt.");
                              } finally {
                                setPrecaching(false);
                              }
                            }}
                          >
                            {precaching ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Sparkles className="h-3 w-3 mr-1" />}
                            Pre-analyse
                          </Button>
                        )}
                      </div>
                    )}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Community discussies</Label>
                          <p className="text-[10px] text-muted-foreground">
                            Lezers kunnen discussies starten en reageren op het document
                          </p>
                        </div>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={discussionsEnabled}
                          onClick={() => setDiscussionsEnabled(!discussionsEnabled)}
                          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                            discussionsEnabled ? "bg-primary" : "bg-gray-200"
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                              discussionsEnabled ? "translate-x-4" : "translate-x-0"
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Toegang & publicatie */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Toegang & publicatie</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-4">
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
                          autoComplete="new-password"
                        />
                      )}
                    </div>
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
                  <div className="space-y-4">
                    <div className="space-y-3">
                      <Label>Publicatie</Label>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">Concept</p>
                          <p className="text-[10px] text-muted-foreground">
                            Als concept is het document niet publiek zichtbaar
                          </p>
                        </div>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={isDraft}
                          onClick={() => {
                            const newVal = !isDraft;
                            setIsDraft(newVal);
                            if (!newVal) setScheduledPublishAt("");
                          }}
                          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                            isDraft ? "bg-primary" : "bg-gray-200"
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                              isDraft ? "translate-x-4" : "translate-x-0"
                            }`}
                          />
                        </button>
                      </div>
                      {isDraft && (
                        <div className="space-y-2">
                          <Label>Geplande publicatie</Label>
                          <input
                            type="datetime-local"
                            value={scheduledPublishAt}
                            onChange={(e) => setScheduledPublishAt(e.target.value)}
                            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                          />
                          <p className="text-[10px] text-muted-foreground">
                            Optioneel. Het document wordt automatisch gepubliceerd op dit moment.
                          </p>
                        </div>
                      )}
                      <div className="text-xs">
                        <span className="text-muted-foreground">Status: </span>
                        {isDraft && scheduledPublishAt ? (
                          <span className="text-purple-600 font-medium">
                            Gepland op {new Date(scheduledPublishAt).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                          </span>
                        ) : isDraft ? (
                          <span className="text-gray-600 font-medium">Concept</span>
                        ) : (
                          <span className="text-green-600 font-medium">Gepubliceerd</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Insluiten */}
            {doc.status === "ready" && <EmbedTabContent doc={doc} />}
          </div>
        </TabsContent>

        {/* ===== VERSIES TAB ===== */}
        <TabsContent value="versies">
          <div className="mx-auto max-w-4xl py-6">
            <VersionHistory documentId={doc._id} />
          </div>
        </TabsContent>
      </Tabs>

      {/* Lightbox overlay */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => setLightboxUrl(null)}
          onKeyDown={(e) => { if (e.key === "Escape") setLightboxUrl(null); }}
          role="dialog"
          aria-label="Afbeelding voorbeeld"
          tabIndex={0}
        >
          <button
            onClick={() => setLightboxUrl(null)}
            className="absolute top-4 right-4 rounded-full bg-black/50 p-2 text-white hover:bg-black/70 transition-colors"
            aria-label="Sluiten"
          >
            <X className="h-5 w-5" />
          </button>
          <img
            src={lightboxUrl}
            alt="Pagina voorbeeld"
            className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}

// -- Embed Tab Component --
function EmbedTabContent({ doc }: { doc: DocumentData }) {
  const [embedTheme, setEmbedTheme] = useState<"light" | "dark">("light");
  const [embedCompact, setEmbedCompact] = useState(false);
  const [embedWidth, setEmbedWidth] = useState("100%");
  const [embedHeight, setEmbedHeight] = useState("600");
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://doc1.ai";

  const embedParams = new URLSearchParams();
  if (embedTheme === "dark") embedParams.set("theme", "dark");
  if (embedCompact) embedParams.set("compact", "true");
  const queryString = embedParams.toString();
  const embedUrl = `${siteUrl}/embed/${doc.shortId}${queryString ? `?${queryString}` : ""}`;

  const widthAttr = embedWidth.includes("%") ? embedWidth : `${embedWidth}px`;
  const iframeCode = `<iframe src="${embedUrl}" width="${widthAttr}" height="${embedHeight}" style="border: 1px solid #e5e7eb; border-radius: 8px;" frameborder="0" allowfullscreen></iframe>`;

  const scriptCode = `<div id="doc1-embed-${doc.shortId}"></div>
<script>
(function() {
  var c = document.getElementById('doc1-embed-${doc.shortId}');
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

  async function copyToClipboard(text: string, field: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      toast.success("Gekopieerd naar klembord");
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      toast.error("Kon niet kopieren");
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 py-6">
      {/* Options */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Embed instellingen
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Thema</Label>
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
              <Label>Weergave</Label>
              <Select
                value={embedCompact ? "compact" : "full"}
                onValueChange={(v) => setEmbedCompact(v === "compact")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full">Volledig (samenvatting, hoofdpunten, begrippen)</SelectItem>
                  <SelectItem value="compact">Compact (alleen samenvatting)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Breedte</Label>
              <Input
                value={embedWidth}
                onChange={(e) => setEmbedWidth(e.target.value)}
                placeholder="100% of 600"
              />
              <p className="text-xs text-muted-foreground">
                Gebruik % of pixels (bijv. 100%, 800)
              </p>
            </div>
            <div className="space-y-2">
              <Label>Hoogte (px)</Label>
              <Input
                value={embedHeight}
                onChange={(e) => setEmbedHeight(e.target.value)}
                placeholder="600"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Iframe Code */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Code className="h-4 w-4" />
            iFrame code
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="relative">
            <pre className="overflow-x-auto rounded-lg border bg-gray-50 p-4 text-xs text-gray-700">
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
              {copiedField === "iframe" ? "Gekopieerd" : "Kopieren"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* JavaScript Code */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Code className="h-4 w-4" />
            JavaScript snippet
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="relative">
            <pre className="overflow-x-auto rounded-lg border bg-gray-50 p-4 text-xs text-gray-700">
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
              {copiedField === "script" ? "Gekopieerd" : "Kopieren"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Direct URL */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ExternalLink className="h-4 w-4" />
            Directe URL
          </CardTitle>
        </CardHeader>
        <CardContent>
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
              {copiedField === "url" ? "Gekopieerd" : "Kopieren"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Eye className="h-4 w-4" />
            Voorbeeld
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className="overflow-hidden rounded-lg border"
            style={{ height: `${Math.min(Number(embedHeight) || 600, 700)}px` }}
          >
            <iframe
              src={embedUrl}
              width="100%"
              height="100%"
              style={{ border: "none" }}
              title="Embed voorbeeld"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

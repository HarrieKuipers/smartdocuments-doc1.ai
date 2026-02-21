"use client";

import { useEffect, useState, useCallback } from "react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Check,
  Eye,
  Globe,
  Loader2,
  Lock,
  Link as LinkIcon,
  X,
} from "lucide-react";
import { toast } from "sonner";

interface DocumentData {
  _id: string;
  shortId: string;
  title: string;
  authors: string[];
  publicationDate?: string;
  version?: string;
  tags: string[];
  description?: string;
  status: string;
  access: { type: string; password?: string };
  content: {
    summary: { original: string; B1: string; B2: string; C1: string };
    keyPoints: { text: string; linkedTerms: string[] }[];
    findings: { category: string; title: string; content: string }[];
    terms: { term: string; definition: string; occurrences: number }[];
  };
  brandOverride?: { primary?: string };
}

const BRAND_PRESETS = [
  { name: "Smart", primary: "#00BCD4" },
  { name: "Rijksoverheid", primary: "#154273" },
  { name: "Amsterdam", primary: "#EC0000" },
  { name: "Aangepast", primary: "" },
];

export default function DocumentEditPage() {
  const params = useParams();
  const router = useRouter();
  const [doc, setDoc] = useState<DocumentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(true);
  const [publishing, setPublishing] = useState(false);

  // Editable fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [accessType, setAccessType] = useState("public");
  const [summary, setSummary] = useState("");
  const [brandPrimary, setBrandPrimary] = useState("#00BCD4");

  useEffect(() => {
    async function fetchDoc() {
      try {
        const res = await fetch(`/api/documents/${params.id}`);
        if (!res.ok) throw new Error();
        const { data } = await res.json();
        setDoc(data);
        setTitle(data.title || "");
        setDescription(data.description || "");
        setAccessType(data.access?.type || "public");
        setSummary(data.content?.summary?.original || "");
        setBrandPrimary(data.brandOverride?.primary || "#00BCD4");
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
      await fetch(`/api/documents/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          access: { type: accessType },
          "content.summary.original": summary,
          brandOverride: { primary: brandPrimary },
        }),
      });
      setSaved(true);
    } catch {
      toast.error("Opslaan mislukt.");
    } finally {
      setSaving(false);
    }
  }, [params.id, doc, title, description, accessType, summary, brandPrimary]);

  useEffect(() => {
    if (!doc) return;
    setSaved(false);
    const timer = setTimeout(saveChanges, 2000);
    return () => clearTimeout(timer);
  }, [title, description, accessType, summary, brandPrimary, saveChanges, doc]);

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

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <div className="grid grid-cols-12 gap-6">
          <Skeleton className="col-span-3 h-96" />
          <Skeleton className="col-span-6 h-96" />
          <Skeleton className="col-span-3 h-96" />
        </div>
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
            onClick={() => window.open(`/d/${doc.shortId}`, "_blank")}
          >
            <Eye className="mr-1 h-4 w-4" />
            Voorbeeld
          </Button>
          <Button
            size="sm"
            className="bg-[#00BCD4] hover:bg-[#00838F]"
            onClick={handlePublish}
            disabled={publishing}
          >
            {publishing && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
            Publiceren
          </Button>
        </div>
      </div>

      {/* 3-column layout */}
      <div className="grid grid-cols-12 gap-6">
        {/* Left: Settings */}
        <div className="col-span-3 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Instellingen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Titel</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
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

              <Separator />

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
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Huisstijl</Label>
                <div className="grid grid-cols-2 gap-2">
                  {BRAND_PRESETS.map((preset) => (
                    <button
                      key={preset.name}
                      onClick={() =>
                        preset.primary && setBrandPrimary(preset.primary)
                      }
                      className={`rounded-lg border p-2 text-xs transition-all ${
                        brandPrimary === preset.primary
                          ? "border-[#00BCD4] ring-2 ring-[#00BCD4]/20"
                          : "hover:border-gray-400"
                      }`}
                    >
                      <div
                        className="mb-1 h-6 rounded"
                        style={{
                          backgroundColor:
                            preset.primary || brandPrimary,
                        }}
                      />
                      {preset.name}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Center: Content preview */}
        <div className="col-span-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Samenvatting</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                rows={8}
                className="resize-none"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Hoofdpunten</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {doc.content?.keyPoints?.map((kp, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#00BCD4]" />
                    <span className="text-sm">{kp.text}</span>
                  </li>
                ))}
                {(!doc.content?.keyPoints ||
                  doc.content.keyPoints.length === 0) && (
                  <p className="text-sm text-muted-foreground">
                    Geen hoofdpunten gegenereerd.
                  </p>
                )}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Belangrijke Bevindingen</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {doc.content?.findings?.map((f, i) => (
                  <div key={i} className="rounded-lg border p-3">
                    <Badge variant="outline" className="mb-2 text-xs">
                      {f.category}
                    </Badge>
                    <h4 className="mb-1 text-sm font-medium">{f.title}</h4>
                    <p className="text-xs text-muted-foreground">
                      {f.content}
                    </p>
                  </div>
                ))}
                {(!doc.content?.findings ||
                  doc.content.findings.length === 0) && (
                  <p className="col-span-2 text-sm text-muted-foreground">
                    Geen bevindingen gegenereerd.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Terms */}
        <div className="col-span-3 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">
                Begrippen & Definities
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {doc.content?.terms?.map((t, i) => (
                  <div key={i} className="rounded-lg bg-gray-50 p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-[#00BCD4]">
                        {t.term}
                      </span>
                      <Badge variant="secondary" className="text-xs">
                        {t.occurrences}x
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t.definition}
                    </p>
                  </div>
                ))}
                {(!doc.content?.terms ||
                  doc.content.terms.length === 0) && (
                  <p className="text-sm text-muted-foreground">
                    Geen begrippen geëxtraheerd.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Deellink</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={`${process.env.NEXT_PUBLIC_SITE_URL || ""}/d/${doc.shortId}`}
                  className="text-xs"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(
                      `${window.location.origin}/d/${doc.shortId}`
                    );
                    toast.success("Link gekopieerd!");
                  }}
                >
                  Kopieer
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

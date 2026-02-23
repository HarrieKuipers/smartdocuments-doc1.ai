"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  X,
  Sparkles,
  FileText,
  PenLine,
} from "lucide-react";
import { toast } from "sonner";

interface DocumentData {
  _id: string;
  title: string;
  authors: string[];
  publicationDate?: string;
  version?: string;
  tags: string[];
  description?: string;
  languageLevel?: string;
  publicationTypes?: string[];
  schrijfwijzerIds?: string[];
  sourceFile: { filename: string };
}

interface SchrijfwijzerData {
  _id: string;
  name: string;
  description?: string;
  isDefault: boolean;
}

export default function MetadataPage() {
  const params = useParams();
  const router = useRouter();
  const [doc, setDoc] = useState<DocumentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [tagInput, setTagInput] = useState("");

  // Form fields
  const [title, setTitle] = useState("");
  const [authors, setAuthors] = useState<string[]>([]);
  const [authorInput, setAuthorInput] = useState("");
  const [publicationDate, setPublicationDate] = useState("");
  const [version, setVersion] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [description, setDescription] = useState("");

  // Publicatietype & taal/schrijfwijzer
  const [publicationTypes, setPublicationTypes] = useState<string[]>(["smart"]);
  const [languageLevel, setLanguageLevel] = useState("B1");
  const [schrijfwijzers, setSchrijfwijzers] = useState<SchrijfwijzerData[]>([]);
  const [selectedSchrijfwijzerIds, setSelectedSchrijfwijzerIds] = useState<string[]>([]);

  const hasHerziend = publicationTypes.includes("herziend");

  useEffect(() => {
    async function fetchData() {
      try {
        const [docRes, swRes] = await Promise.all([
          fetch(`/api/documents/${params.id}`),
          fetch("/api/schrijfwijzers"),
        ]);

        if (!docRes.ok) throw new Error();
        const { data } = await docRes.json();
        setDoc(data);
        setTitle(data.title || "");
        setAuthors(data.authors || []);
        setPublicationDate(
          data.publicationDate
            ? new Date(data.publicationDate).toISOString().split("T")[0]
            : ""
        );
        setVersion(data.version || "");
        setTags(data.tags || []);
        setDescription(data.description || "");
        setLanguageLevel(data.languageLevel || "B1");
        if (data.publicationTypes?.length) setPublicationTypes(data.publicationTypes);
        if (data.schrijfwijzerIds?.length) setSelectedSchrijfwijzerIds(data.schrijfwijzerIds);

        // Load schrijfwijzers (seed if needed)
        let swList = swRes.ok ? (await swRes.json()).data : [];

        if (!swList?.length) {
          await fetch("/api/schrijfwijzers", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ seed: true }),
          });
          const seededRes = await fetch("/api/schrijfwijzers");
          if (seededRes.ok) {
            swList = (await seededRes.json()).data;
          }
        }

        if (swList?.length) {
          setSchrijfwijzers(swList);
          // Pre-select default if nothing was set on the document
          if (!data.schrijfwijzerIds?.length) {
            const defaultSw = swList.find((sw: SchrijfwijzerData) => sw.isDefault);
            if (defaultSw) setSelectedSchrijfwijzerIds([defaultSw._id]);
          }
        }
      } catch {
        toast.error("Kon document niet laden.");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [params.id]);

  function togglePublicationType(type: string) {
    setPublicationTypes((prev) => {
      if (prev.includes(type)) {
        // Must have at least one selected
        if (prev.length === 1) return prev;
        return prev.filter((t) => t !== type);
      }
      return [...prev, type];
    });
  }

  function toggleSchrijfwijzer(id: string) {
    setSelectedSchrijfwijzerIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  }

  async function handleExtractMetadata() {
    setExtracting(true);
    try {
      const res = await fetch(`/api/documents/${params.id}/extract-metadata`, {
        method: "POST",
      });
      if (!res.ok) throw new Error();
      const { data } = await res.json();
      if (data.title) setTitle(data.title);
      if (data.authors?.length) setAuthors(data.authors);
      if (data.publicationDate) setPublicationDate(data.publicationDate);
      if (data.version) setVersion(data.version);
      if (data.tags?.length) setTags(data.tags);
      if (data.description) setDescription(data.description);
      toast.success("Metadata geëxtraheerd met AI!");
    } catch {
      toast.error("AI metadata-extractie mislukt.");
    } finally {
      setExtracting(false);
    }
  }

  async function handleSaveAndContinue() {
    if (publicationTypes.length === 0) {
      toast.error("Selecteer minimaal één publicatietype.");
      return;
    }
    if (hasHerziend && selectedSchrijfwijzerIds.length === 0) {
      toast.error("Selecteer minimaal één schrijfwijzer voor een herziend document.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/documents/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          authors,
          publicationDate: publicationDate || undefined,
          version: version || undefined,
          tags,
          description,
          languageLevel,
          publicationTypes,
          schrijfwijzerIds: selectedSchrijfwijzerIds,
        }),
      });
      if (!res.ok) throw new Error();

      // Start Smart Document processing in background if selected
      if (publicationTypes.includes("smart")) {
        fetch(`/api/documents/${params.id}/process`, { method: "POST" });
      }

      // Always go to the combined processing page
      router.push(`/dashboard/documents/${params.id}/processing`);
    } catch {
      toast.error("Kon metadata niet opslaan.");
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Metadata Verificatie</h1>
          <p className="text-muted-foreground">
            Controleer en bewerk de documentgegevens
          </p>
        </div>
        <Button
          variant="outline"
          onClick={handleExtractMetadata}
          disabled={extracting}
        >
          {extracting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="mr-2 h-4 w-4" />
          )}
          AI Extractie
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Document: {doc?.sourceFile.filename}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Titel</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Titel van het document"
            />
          </div>

          <div className="space-y-2">
            <Label>Auteur(s)</Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {authors.map((author, i) => (
                <Badge key={i} variant="secondary" className="gap-1">
                  {author}
                  <button onClick={() => setAuthors(authors.filter((_, j) => j !== i))}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={authorInput}
                onChange={(e) => setAuthorInput(e.target.value)}
                placeholder="Voeg auteur toe"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && authorInput.trim()) {
                    e.preventDefault();
                    setAuthors([...authors, authorInput.trim()]);
                    setAuthorInput("");
                  }
                }}
              />
              <Button
                variant="outline"
                onClick={() => {
                  if (authorInput.trim()) {
                    setAuthors([...authors, authorInput.trim()]);
                    setAuthorInput("");
                  }
                }}
              >
                Toevoegen
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Publicatiedatum</Label>
              <Input
                id="date"
                type="date"
                value={publicationDate}
                onChange={(e) => setPublicationDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="version">Versie</Label>
              <Input
                id="version"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                placeholder="bijv. 1.0"
              />
            </div>
          </div>

          {/* Publicatietype — multi-select */}
          <div className="space-y-3">
            <Label>Publicatietype</Label>
            <div className="grid grid-cols-2 gap-3">
              <div
                role="button"
                tabIndex={0}
                onClick={() => togglePublicationType("smart")}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); togglePublicationType("smart"); } }}
                className={`flex items-start gap-3 rounded-lg border-2 p-4 text-left transition-colors cursor-pointer ${
                  publicationTypes.includes("smart")
                    ? "border-[#0062EB] bg-blue-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <Checkbox
                  checked={publicationTypes.includes("smart")}
                  onCheckedChange={() => togglePublicationType("smart")}
                  className="mt-0.5"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <FileText className={`h-4 w-4 shrink-0 ${
                      publicationTypes.includes("smart") ? "text-[#0062EB]" : "text-gray-400"
                    }`} />
                    <p className="font-medium text-sm">Smart Document</p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Interactief AI-document met samenvatting, hoofdpunten en bevindingen
                  </p>
                </div>
              </div>
              <div
                role="button"
                tabIndex={0}
                onClick={() => togglePublicationType("herziend")}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); togglePublicationType("herziend"); } }}
                className={`flex items-start gap-3 rounded-lg border-2 p-4 text-left transition-colors cursor-pointer ${
                  publicationTypes.includes("herziend")
                    ? "border-[#0062EB] bg-blue-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <Checkbox
                  checked={publicationTypes.includes("herziend")}
                  onCheckedChange={() => togglePublicationType("herziend")}
                  className="mt-0.5"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <PenLine className={`h-4 w-4 shrink-0 ${
                      publicationTypes.includes("herziend") ? "text-[#0062EB]" : "text-gray-400"
                    }`} />
                    <p className="font-medium text-sm">Herziend Document</p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Herschreven op B1 taalniveau met schrijfwijzer-regels
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Taalniveau & Schrijfwijzer — merged section */}
          <div className="space-y-4 rounded-lg border p-4">
            <p className="text-sm font-medium">Taal & Schrijfwijzer</p>

            <div className="space-y-2">
              <Label>Taalniveau</Label>
              <Select value={languageLevel} onValueChange={setLanguageLevel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="B1">B1 — Eenvoudig</SelectItem>
                  <SelectItem value="B2">B2 — Gemiddeld</SelectItem>
                  <SelectItem value="C1">C1 — Geavanceerd</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>
                Schrijfwijzer{" "}
                {hasHerziend ? (
                  <span className="text-xs text-red-500 font-normal">(verplicht)</span>
                ) : (
                  <span className="text-xs text-muted-foreground font-normal">(optioneel)</span>
                )}
              </Label>
              {schrijfwijzers.length > 0 ? (
                schrijfwijzers.length === 1 ? (
                  // Single schrijfwijzer — simple select
                  <div className="flex items-center gap-2 rounded-md border px-3 py-2">
                    <Checkbox
                      checked={selectedSchrijfwijzerIds.includes(schrijfwijzers[0]._id)}
                      onCheckedChange={() => toggleSchrijfwijzer(schrijfwijzers[0]._id)}
                    />
                    <span className="text-sm">
                      {schrijfwijzers[0].name}
                      {schrijfwijzers[0].isDefault ? " (standaard)" : ""}
                    </span>
                    {schrijfwijzers[0].description && (
                      <span className="text-xs text-muted-foreground ml-auto">
                        {schrijfwijzers[0].description}
                      </span>
                    )}
                  </div>
                ) : (
                  // Multiple schrijfwijzers — multi-select list
                  <div className="space-y-2">
                    {schrijfwijzers.map((sw) => (
                      <div
                        key={sw._id}
                        role="button"
                        tabIndex={0}
                        className={`flex items-start gap-2 rounded-md border px-3 py-2 cursor-pointer transition-colors ${
                          selectedSchrijfwijzerIds.includes(sw._id)
                            ? "border-[#0062EB] bg-blue-50/50"
                            : "hover:border-gray-300"
                        }`}
                        onClick={() => toggleSchrijfwijzer(sw._id)}
                        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleSchrijfwijzer(sw._id); } }}
                      >
                        <Checkbox
                          checked={selectedSchrijfwijzerIds.includes(sw._id)}
                          onCheckedChange={() => toggleSchrijfwijzer(sw._id)}
                          className="mt-0.5"
                        />
                        <div>
                          <p className="text-sm font-medium">
                            {sw.name}
                            {sw.isDefault ? " (standaard)" : ""}
                          </p>
                          {sw.description && (
                            <p className="text-xs text-muted-foreground">
                              {sw.description}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                <p className="text-sm text-muted-foreground">
                  Geen schrijfwijzers beschikbaar.
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Tags</Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {tags.map((tag, i) => (
                <Badge key={i} variant="secondary" className="gap-1">
                  {tag}
                  <button onClick={() => setTags(tags.filter((_, j) => j !== i))}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <Input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              placeholder="Typ een tag en druk Enter"
              onKeyDown={(e) => {
                if (e.key === "Enter" && tagInput.trim()) {
                  e.preventDefault();
                  setTags([...tags, tagInput.trim()]);
                  setTagInput("");
                }
              }}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Beschrijving</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Korte beschrijving van het document"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => router.push("/dashboard/upload")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Terug
        </Button>
        <Button
          className="bg-[#0062EB] hover:bg-[#0050C0]"
          onClick={handleSaveAndContinue}
          disabled={saving}
        >
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Doorgaan naar Verwerking
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

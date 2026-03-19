"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Upload,
  FileText,
  X,
  Loader2,
  Check,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  FolderPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

const ACCEPTED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const MAX_SIZE = 25 * 1024 * 1024;
const MAX_FILES = 50;
const MAX_CONCURRENT_UPLOADS = 3;

interface BulkFile {
  id: string;
  file: File;
  status:
    | "pending"
    | "uploading"
    | "uploaded"
    | "creating"
    | "processing"
    | "ready"
    | "error";
  storageKey?: string;
  documentId?: string;
  error?: string;
  progress?: number;
  step?: string;
}

interface BatchSettings {
  collectionMode: "none" | "existing" | "new";
  collectionId?: string;
  newCollectionName?: string;
  language: "nl" | "en";
  targetCEFRLevel: string;
  template: string;
  access: { type: "public" | "link-only" | "password"; password?: string };
  autoProcess: boolean;
}

interface CollectionOption {
  _id: string;
  name: string;
}

interface TemplateOption {
  id: string;
  name: string;
}

type Phase = "selecting" | "configuring" | "processing";

export default function BulkUploadZone() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("selecting");
  const [dragActive, setDragActive] = useState(false);
  const [files, setFiles] = useState<BulkFile[]>([]);
  const [settings, setSettings] = useState<BatchSettings>({
    collectionMode: "none",
    language: "nl",
    targetCEFRLevel: "none",
    template: "none",
    access: { type: "link-only" },
    autoProcess: true,
  });
  const [collections, setCollections] = useState<CollectionOption[]>([]);
  const [templates, setTemplates] = useState<TemplateOption[]>([]);
  const [cancelled, setCancelled] = useState(false);
  const cancelledRef = useRef(false);

  // Fetch collections and templates
  useEffect(() => {
    fetch("/api/collections")
      .then((r) => r.json())
      .then((d) => setCollections(d.data || []))
      .catch(() => {});
    fetch("/api/templates")
      .then((r) => r.json())
      .then((d) => setTemplates(d.data || []))
      .catch(() => {});
  }, []);

  const addFiles = useCallback(
    (newFiles: FileList | File[]) => {
      const toAdd: BulkFile[] = [];
      for (const f of Array.from(newFiles)) {
        if (!ACCEPTED_TYPES.includes(f.type)) {
          toast.error(`${f.name}: alleen PDF en DOCX toegestaan.`);
          continue;
        }
        if (f.size > MAX_SIZE) {
          toast.error(`${f.name}: te groot (max 25MB).`);
          continue;
        }
        if (files.length + toAdd.length >= MAX_FILES) {
          toast.error(`Maximum ${MAX_FILES} bestanden per batch.`);
          break;
        }
        // Skip duplicates
        if (files.some((ef) => ef.file.name === f.name && ef.file.size === f.size)) {
          continue;
        }
        toAdd.push({
          id: crypto.randomUUID(),
          file: f,
          status: "pending",
        });
      }
      if (toAdd.length > 0) {
        setFiles((prev) => [...prev, ...toAdd]);
      }
    },
    [files]
  );

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      if (e.dataTransfer.files?.length) {
        addFiles(e.dataTransfer.files);
      }
    },
    [addFiles]
  );

  const updateFile = useCallback(
    (id: string, updates: Partial<BulkFile>) => {
      setFiles((prev) =>
        prev.map((f) => (f.id === id ? { ...f, ...updates } : f))
      );
    },
    []
  );

  // Upload a single file to storage
  async function uploadSingleFile(bulkFile: BulkFile): Promise<string> {
    const formData = new FormData();
    formData.append("file", bulkFile.file);
    const res = await fetch("/api/upload", { method: "POST", body: formData });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Upload mislukt.");
    }
    const { key } = await res.json();
    return key;
  }

  // Upload all files with concurrency limit
  async function uploadAllFiles(bulkFiles: BulkFile[]) {
    const queue = [...bulkFiles];
    const running: Promise<void>[] = [];

    while (queue.length > 0 || running.length > 0) {
      if (cancelledRef.current) break;

      while (running.length < MAX_CONCURRENT_UPLOADS && queue.length > 0) {
        const bf = queue.shift()!;
        updateFile(bf.id, { status: "uploading" });

        const promise = uploadSingleFile(bf)
          .then((key) => {
            updateFile(bf.id, { status: "uploaded", storageKey: key });
            bf.storageKey = key;
          })
          .catch((err) => {
            updateFile(bf.id, {
              status: "error",
              error: err.message || "Upload mislukt.",
            });
          })
          .finally(() => {
            running.splice(running.indexOf(promise), 1);
          });

        running.push(promise);
      }

      if (running.length > 0) {
        await Promise.race(running);
      }
    }
  }

  // Wait for a document to finish processing via SSE
  function waitForProcessing(
    documentId: string,
    fileId: string
  ): Promise<void> {
    return new Promise((resolve) => {
      const eventSource = new EventSource(
        `/api/documents/${documentId}/progress`
      );

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.error) {
            updateFile(fileId, { status: "error", error: data.error });
            eventSource.close();
            resolve();
            return;
          }

          updateFile(fileId, {
            progress: data.percentage || 0,
            step: data.step || "",
          });

          if (data.status === "ready") {
            updateFile(fileId, { status: "ready", progress: 100 });
            eventSource.close();
            resolve();
          } else if (data.status === "error") {
            updateFile(fileId, {
              status: "error",
              error: "Verwerking mislukt.",
            });
            eventSource.close();
            resolve();
          }
        } catch {
          // ignore parse errors
        }
      };

      eventSource.onerror = () => {
        eventSource.close();
        updateFile(fileId, {
          status: "error",
          error: "Verbinding verloren.",
        });
        resolve();
      };

      // Timeout after 10 minutes per document
      setTimeout(() => {
        eventSource.close();
        resolve();
      }, 10 * 60 * 1000);
    });
  }

  // Main processing flow
  async function startProcessing() {
    setPhase("processing");
    setCancelled(false);
    cancelledRef.current = false;

    // Step 1: Upload all files
    await uploadAllFiles(files);

    if (cancelledRef.current) return;

    // Step 2: Create all documents via bulk API
    const uploadedFiles = files.filter((f) => f.storageKey);
    if (uploadedFiles.length === 0) {
      toast.error("Geen bestanden succesvol geüpload.");
      return;
    }

    // Mark all as creating
    for (const f of uploadedFiles) {
      updateFile(f.id, { status: "creating" });
    }

    try {
      const res = await fetch("/api/documents/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documents: uploadedFiles.map((f) => ({
            filename: f.file.name,
            mimeType: f.file.type,
            sizeBytes: f.file.size,
            storageKey: f.storageKey,
          })),
          settings: {
            collectionId:
              settings.collectionMode === "existing"
                ? settings.collectionId
                : undefined,
            newCollectionName:
              settings.collectionMode === "new"
                ? settings.newCollectionName
                : undefined,
            language: settings.language,
            targetCEFRLevel:
              settings.targetCEFRLevel !== "none"
                ? settings.targetCEFRLevel
                : undefined,
            template:
              settings.template !== "none" ? settings.template : undefined,
            access: settings.access,
            autoProcess: settings.autoProcess,
          },
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "Kon documenten niet aanmaken.");
        for (const f of uploadedFiles) {
          updateFile(f.id, { status: "error", error: err.error });
        }
        return;
      }

      const { data: createdDocs } = await res.json();

      // Map document IDs back to files
      for (let i = 0; i < uploadedFiles.length; i++) {
        const doc = createdDocs[i];
        if (doc) {
          updateFile(uploadedFiles[i].id, {
            documentId: doc._id,
            status: settings.autoProcess ? "processing" : "ready",
          });
          uploadedFiles[i].documentId = doc._id;
        }
      }
    } catch {
      toast.error("Er is een fout opgetreden bij het aanmaken.");
      return;
    }

    // Step 3: Process sequentially if autoProcess is on
    if (settings.autoProcess) {
      const toProcess = uploadedFiles.filter((f) => f.documentId);

      for (const f of toProcess) {
        if (cancelledRef.current) break;

        updateFile(f.id, { status: "processing", progress: 0 });

        try {
          await fetch(`/api/documents/${f.documentId}/process`, {
            method: "POST",
          });
          await waitForProcessing(f.documentId!, f.id);
        } catch {
          updateFile(f.id, {
            status: "error",
            error: "Verwerking mislukt.",
          });
        }
      }
    }

    if (!cancelledRef.current) {
      toast.success("Alle documenten verwerkt!");
    }
  }

  const completedCount = files.filter(
    (f) => f.status === "ready"
  ).length;
  const errorCount = files.filter((f) => f.status === "error").length;
  const totalProgress =
    files.length > 0 ? Math.round((completedCount / files.length) * 100) : 0;

  // ─── PHASE: SELECTING ──────────────────────────────────
  if (phase === "selecting") {
    return (
      <div className="space-y-6">
        {/* Drop zone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
          className={`relative flex min-h-[250px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed transition-colors ${
            dragActive
              ? "border-[#0062EB] bg-[#0062EB]/5"
              : "border-gray-300 bg-white hover:border-[#0062EB]/50"
          }`}
          onClick={() => {
            const input = document.createElement("input");
            input.type = "file";
            input.accept = ".pdf,.docx";
            input.multiple = true;
            input.onchange = (e) => {
              const fl = (e.target as HTMLInputElement).files;
              if (fl) addFiles(fl);
            };
            input.click();
          }}
        >
          <Upload className="mb-4 h-12 w-12 text-muted-foreground" />
          <p className="mb-2 text-lg font-medium">
            Sleep meerdere documenten hierheen
          </p>
          <p className="text-sm text-muted-foreground">
            of klik om bestanden te selecteren
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            PDF of DOCX — maximaal 25MB per bestand — max {MAX_FILES} bestanden
          </p>
        </div>

        {/* File list */}
        {files.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">
                {files.length} bestand{files.length !== 1 ? "en" : ""}{" "}
                geselecteerd
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFiles([])}
                className="text-muted-foreground"
              >
                Alles verwijderen
              </Button>
            </div>

            <div className="max-h-[300px] space-y-1 overflow-y-auto rounded-lg border bg-white p-2">
              {files.map((bf) => (
                <div
                  key={bf.id}
                  className="flex items-center justify-between rounded-md px-3 py-2 hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-[#0062EB]/10">
                      <FileText className="h-4 w-4 text-[#0062EB]" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {bf.file.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {(bf.file.size / 1024 / 1024).toFixed(1)} MB
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0"
                    onClick={() => removeFile(bf.id)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>

            <Button
              className="w-full bg-[#0062EB] hover:bg-[#0050C0]"
              onClick={() => setPhase("configuring")}
            >
              <ArrowRight className="mr-2 h-4 w-4" />
              Volgende: instellingen
            </Button>
          </div>
        )}
      </div>
    );
  }

  // ─── PHASE: CONFIGURING ────────────────────────────────
  if (phase === "configuring") {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setPhase("selecting")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-lg font-semibold">
              Instellingen voor {files.length} document
              {files.length !== 1 ? "en" : ""}
            </h2>
            <p className="text-sm text-muted-foreground">
              Deze instellingen gelden voor alle geselecteerde bestanden
            </p>
          </div>
        </div>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <FolderPlus className="h-4 w-4" />
              Collectie
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Select
              value={settings.collectionMode}
              onValueChange={(v) =>
                setSettings((s) => ({
                  ...s,
                  collectionMode: v as BatchSettings["collectionMode"],
                }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Geen collectie</SelectItem>
                <SelectItem value="existing">Bestaande collectie</SelectItem>
                <SelectItem value="new">Nieuwe collectie aanmaken</SelectItem>
              </SelectContent>
            </Select>

            {settings.collectionMode === "existing" && (
              <Select
                value={settings.collectionId || ""}
                onValueChange={(v) =>
                  setSettings((s) => ({ ...s, collectionId: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Kies een collectie..." />
                </SelectTrigger>
                <SelectContent>
                  {collections.map((c) => (
                    <SelectItem key={c._id} value={c._id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {settings.collectionMode === "new" && (
              <Input
                placeholder="Naam nieuwe collectie"
                value={settings.newCollectionName || ""}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    newCollectionName: e.target.value,
                  }))
                }
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="grid gap-4 pt-6 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Taal</Label>
              <Select
                value={settings.language}
                onValueChange={(v) =>
                  setSettings((s) => ({
                    ...s,
                    language: v as "nl" | "en",
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nl">Nederlands</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Taalniveau (CEFR)</Label>
              <Select
                value={settings.targetCEFRLevel}
                onValueChange={(v) =>
                  setSettings((s) => ({ ...s, targetCEFRLevel: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Geen voorkeur</SelectItem>
                  <SelectItem value="B1">B1 — Eenvoudig</SelectItem>
                  <SelectItem value="B2">B2 — Gemiddeld</SelectItem>
                  <SelectItem value="C1">C1 — Gevorderd</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Sjabloon</Label>
              <Select
                value={settings.template}
                onValueChange={(v) =>
                  setSettings((s) => ({ ...s, template: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Standaard (doc1)</SelectItem>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Toegang</Label>
              <Select
                value={settings.access.type}
                onValueChange={(v) =>
                  setSettings((s) => ({
                    ...s,
                    access: {
                      ...s.access,
                      type: v as "public" | "link-only" | "password",
                    },
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">Openbaar</SelectItem>
                  <SelectItem value="link-only">Alleen met link</SelectItem>
                  <SelectItem value="password">Wachtwoord</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {settings.access.type === "password" && (
              <div className="space-y-2 sm:col-span-2">
                <Label>Wachtwoord</Label>
                <Input
                  type="password"
                  placeholder="Wachtwoord voor alle documenten"
                  value={settings.access.password || ""}
                  onChange={(e) =>
                    setSettings((s) => ({
                      ...s,
                      access: { ...s.access, password: e.target.value },
                    }))
                  }
                />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center justify-between pt-6">
            <div>
              <p className="font-medium">AI-verwerking</p>
              <p className="text-sm text-muted-foreground">
                {settings.autoProcess
                  ? "Documenten worden automatisch geanalyseerd door AI"
                  : "Alleen uploaden, later handmatig verwerken"}
              </p>
            </div>
            <Switch
              checked={settings.autoProcess}
              onCheckedChange={(v) =>
                setSettings((s) => ({ ...s, autoProcess: v }))
              }
            />
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setPhase("selecting")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Terug
          </Button>
          <Button
            className="flex-1 bg-[#0062EB] hover:bg-[#0050C0]"
            onClick={startProcessing}
            disabled={
              (settings.collectionMode === "existing" &&
                !settings.collectionId) ||
              (settings.collectionMode === "new" &&
                !settings.newCollectionName?.trim())
            }
          >
            <Upload className="mr-2 h-4 w-4" />
            {files.length} document{files.length !== 1 ? "en" : ""}{" "}
            {settings.autoProcess ? "uploaden en verwerken" : "uploaden"}
          </Button>
        </div>
      </div>
    );
  }

  // ─── PHASE: PROCESSING ─────────────────────────────────
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">
          {completedCount + errorCount === files.length
            ? "Verwerking voltooid"
            : "Bezig met verwerken..."}
        </h2>
        <p className="text-sm text-muted-foreground">
          {completedCount} van {files.length} gereed
          {errorCount > 0 && ` — ${errorCount} mislukt`}
        </p>
      </div>

      {/* Overall progress */}
      <div>
        <Progress value={totalProgress} className="h-3" />
        <p className="mt-1 text-right text-xs text-muted-foreground">
          {totalProgress}%
        </p>
      </div>

      {/* Per-file status */}
      <div className="max-h-[400px] space-y-1 overflow-y-auto rounded-lg border bg-white p-2">
        {files.map((bf) => (
          <div
            key={bf.id}
            className="flex items-center gap-3 rounded-md px-3 py-2"
          >
            {/* Status icon */}
            <div className="shrink-0">
              {bf.status === "ready" ? (
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-green-100">
                  <Check className="h-4 w-4 text-green-600" />
                </div>
              ) : bf.status === "error" ? (
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-red-100">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                </div>
              ) : bf.status === "pending" ? (
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100">
                  <div className="h-2 w-2 rounded-full bg-gray-400" />
                </div>
              ) : (
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                </div>
              )}
            </div>

            {/* File info */}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{bf.file.name}</p>
              <p className="text-xs text-muted-foreground">
                {bf.status === "pending" && "Wachtrij"}
                {bf.status === "uploading" && "Uploaden..."}
                {bf.status === "uploaded" && "Geüpload"}
                {bf.status === "creating" && "Document aanmaken..."}
                {bf.status === "processing" &&
                  (bf.step
                    ? `${bf.step} (${bf.progress || 0}%)`
                    : "Verwerken...")}
                {bf.status === "ready" && "Gereed"}
                {bf.status === "error" && (bf.error || "Mislukt")}
              </p>
            </div>

            {/* Per-file progress bar during processing */}
            {bf.status === "processing" && (
              <div className="w-24 shrink-0">
                <Progress value={bf.progress || 0} className="h-1.5" />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        {completedCount + errorCount < files.length && !cancelled ? (
          <Button
            variant="outline"
            onClick={() => {
              setCancelled(true);
              cancelledRef.current = true;
            }}
          >
            Annuleren
          </Button>
        ) : (
          <>
            <Button
              variant="outline"
              onClick={() => router.push("/dashboard/documents")}
            >
              Naar documenten
            </Button>
            {settings.collectionMode !== "none" && (
              <Button
                className="bg-[#0062EB] hover:bg-[#0050C0]"
                onClick={() => {
                  // Find the collection ID from the first created doc
                  const firstDoc = files.find((f) => f.documentId);
                  if (firstDoc?.documentId) {
                    // Navigate to collection - we need to find collection ID
                    router.push("/dashboard/collections");
                  }
                }}
              >
                Naar collecties
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

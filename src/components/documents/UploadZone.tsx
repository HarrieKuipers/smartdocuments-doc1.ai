"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, FileText, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

const ACCEPTED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const MAX_SIZE = 25 * 1024 * 1024; // 25MB

export default function UploadZone() {
  const router = useRouter();
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleFile = useCallback((f: File) => {
    if (!ACCEPTED_TYPES.includes(f.type)) {
      toast.error("Alleen PDF en DOCX bestanden zijn toegestaan.");
      return;
    }
    if (f.size > MAX_SIZE) {
      toast.error("Bestand is te groot. Maximum is 25MB.");
      return;
    }
    setFile(f);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      if (e.dataTransfer.files?.[0]) {
        handleFile(e.dataTransfer.files[0]);
      }
    },
    [handleFile]
  );

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setProgress(10);

    try {
      // 1. Upload file via server
      const formData = new FormData();
      formData.append("file", file);

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      if (!uploadRes.ok) {
        const err = await uploadRes.json();
        throw new Error(err.error || "Upload mislukt.");
      }
      const { key } = await uploadRes.json();

      setProgress(60);

      // 3. Create document record
      const docRes = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          mimeType: file.type,
          sizeBytes: file.size,
          storageKey: key,
        }),
      });
      if (!docRes.ok) {
        const err = await docRes.json();
        throw new Error(err.error || "Kon document niet aanmaken.");
      }
      const doc = await docRes.json();

      setProgress(100);
      toast.success("Document geüpload!");

      // Redirect to metadata page
      router.push(`/dashboard/documents/${doc.data._id}/metadata`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Er is een fout opgetreden."
      );
      setUploading(false);
      setProgress(0);
    }
  };

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
        className={`relative flex min-h-[300px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed transition-colors ${
          dragActive
            ? "border-[#0062EB] bg-[#0062EB]/5"
            : "border-gray-300 bg-white hover:border-[#0062EB]/50"
        }`}
        onClick={() => {
          if (!uploading) {
            const input = document.createElement("input");
            input.type = "file";
            input.accept = ".pdf,.docx";
            input.onchange = (e) => {
              const f = (e.target as HTMLInputElement).files?.[0];
              if (f) handleFile(f);
            };
            input.click();
          }
        }}
      >
        <Upload className="mb-4 h-12 w-12 text-muted-foreground" />
        <p className="mb-2 text-lg font-medium">
          Sleep je document hierheen
        </p>
        <p className="text-sm text-muted-foreground">
          of klik om een bestand te selecteren
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          PDF of DOCX — maximaal 25MB
        </p>
      </div>

      {/* Selected file */}
      {file && (
        <div className="rounded-lg border bg-white p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#0062EB]/10">
                <FileText className="h-5 w-5 text-[#0062EB]" />
              </div>
              <div>
                <p className="font-medium">{file.name}</p>
                <p className="text-sm text-muted-foreground">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            </div>
            {!uploading && (
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  setFile(null);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {uploading && (
            <div className="mt-4">
              <Progress value={progress} className="h-2" />
              <p className="mt-2 text-sm text-muted-foreground">
                {progress < 30
                  ? "Voorbereiden..."
                  : progress < 60
                  ? "Uploaden..."
                  : progress < 100
                  ? "Document aanmaken..."
                  : "Klaar!"}
              </p>
            </div>
          )}

          {!uploading && (
            <Button
              className="mt-4 w-full bg-[#0062EB] hover:bg-[#0050C0]"
              onClick={(e) => {
                e.stopPropagation();
                handleUpload();
              }}
            >
              <Upload className="mr-2 h-4 w-4" />
              Document Uploaden
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

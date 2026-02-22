"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
import { BookOpen, Info, Layout, Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";

interface TemplateData {
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
}

export default function AdminTemplatesPage() {
  const [templates, setTemplates] = useState<TemplateData[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<TemplateData | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/templates")
      .then((r) => r.json())
      .then((d) => setTemplates(d.data))
      .catch(() => toast.error("Kon templates niet laden"))
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    if (!editing) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/templates/${editing.templateId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editing),
      });
      if (!res.ok) throw new Error();
      const { data } = await res.json();
      setTemplates((prev) =>
        prev.map((t) => (t.templateId === data.templateId ? data : t))
      );
      setEditing(null);
      toast.success("Template opgeslagen");
    } catch {
      toast.error("Opslaan mislukt");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Templates</h1>
        <p className="text-sm text-gray-500">
          {templates.length} templates beschikbaar
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {templates.map((t) => (
          <Card
            key={t.templateId}
            className="group cursor-pointer rounded-2xl border-gray-100 overflow-hidden transition-shadow hover:shadow-md"
            onClick={() => setEditing({ ...t })}
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
              <div className="absolute top-3 right-3 rounded-full bg-white/20 p-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                <Pencil className="h-3.5 w-3.5 text-white" />
              </div>
            </div>

            <CardContent className="p-5 space-y-4">
              {/* Colors */}
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400 mb-2">
                  Colors
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
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit dialog */}
      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Template bewerken — {editing?.name}</DialogTitle>
          </DialogHeader>

          {editing && (
            <div className="grid gap-4 py-2">
              {/* Preview */}
              <div
                className="h-16 flex items-end rounded-lg p-3"
                style={{ backgroundColor: editing.primary }}
              >
                <span className="text-sm font-bold text-white">
                  {editing.name}
                </span>
              </div>

              {/* Name */}
              <div className="space-y-1.5">
                <Label>Naam</Label>
                <Input
                  value={editing.name}
                  onChange={(e) =>
                    setEditing({ ...editing, name: e.target.value })
                  }
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
                        value={editing[key]}
                        onChange={(e) =>
                          setEditing({ ...editing, [key]: e.target.value })
                        }
                        className="h-9 w-9 cursor-pointer rounded border border-gray-200 p-0.5"
                      />
                      <Input
                        value={editing[key]}
                        onChange={(e) =>
                          setEditing({ ...editing, [key]: e.target.value })
                        }
                        className="font-mono text-xs"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Logo URL */}
              <div className="space-y-1.5">
                <Label>Logo URL</Label>
                <Input
                  value={editing.logo || ""}
                  onChange={(e) =>
                    setEditing({ ...editing, logo: e.target.value || undefined })
                  }
                  placeholder="/templates/logo.png"
                />
              </div>

              {/* Header style */}
              <div className="space-y-1.5">
                <Label>Header stijl</Label>
                <Select
                  value={editing.headerStyle}
                  onValueChange={(v) =>
                    setEditing({
                      ...editing,
                      headerStyle: v as TemplateData["headerStyle"],
                    })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Default</SelectItem>
                    <SelectItem value="split-bar">Split bar</SelectItem>
                    <SelectItem value="inline-logo">Inline logo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Info box label */}
              <div className="space-y-1.5">
                <Label>Info box label</Label>
                <Input
                  value={editing.infoBoxLabel}
                  onChange={(e) =>
                    setEditing({ ...editing, infoBoxLabel: e.target.value })
                  }
                  placeholder="Meer informatie"
                />
              </div>

              {/* Toggles */}
              <div className="flex gap-6">
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={editing.showB1Button}
                    onCheckedChange={(v) =>
                      setEditing({ ...editing, showB1Button: !!v })
                    }
                  />
                  B1 Button
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={editing.showInfoBox}
                    onCheckedChange={(v) =>
                      setEditing({ ...editing, showInfoBox: !!v })
                    }
                  />
                  Info Box
                </label>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Annuleren
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Opslaan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import {
  BookOpen,
  Plus,
  Loader2,
  Pencil,
  Trash2,
  Star,
  Copy,
  ChevronDown,
  ChevronUp,
  GripVertical,
} from "lucide-react";
import { toast } from "sonner";
import { CATEGORY_LABELS } from "@/types/schrijfwijzer";
import type {
  SchrijfwijzerRule,
  SchrijfwijzerCategory,
} from "@/types/schrijfwijzer";

interface SchrijfwijzerData {
  _id: string;
  name: string;
  description?: string;
  rules: SchrijfwijzerRule[];
  isDefault: boolean;
  createdAt: string;
}

const EMPTY_RULE: SchrijfwijzerRule = {
  number: 1,
  category: "structuur",
  title: "",
  description: "",
  mcpTools: [],
  weight: 2,
};

const CATEGORIES: SchrijfwijzerCategory[] = [
  "voorbereiding",
  "structuur",
  "zinnen",
  "woorden",
];

export default function SchrijfwijzerManagementPage() {
  const [schrijfwijzers, setSchrijfwijzers] = useState<SchrijfwijzerData[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formRules, setFormRules] = useState<SchrijfwijzerRule[]>([]);
  const [expandedRule, setExpandedRule] = useState<number | null>(null);

  // Delete confirmation
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Expanded cards
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  useEffect(() => {
    loadSchrijfwijzers();
  }, []);

  const loadSchrijfwijzers = async () => {
    try {
      const res = await fetch("/api/schrijfwijzers");
      if (res.ok) {
        const { data } = await res.json();
        setSchrijfwijzers(data);
      }
    } catch {
      toast.error("Kon schrijfwijzers niet laden.");
    } finally {
      setLoading(false);
    }
  };

  const openCreateDialog = () => {
    setEditingId(null);
    setFormName("");
    setFormDescription("");
    setFormRules([{ ...EMPTY_RULE }]);
    setExpandedRule(0);
    setDialogOpen(true);
  };

  const openEditDialog = (sw: SchrijfwijzerData) => {
    setEditingId(sw._id);
    setFormName(sw.name);
    setFormDescription(sw.description || "");
    setFormRules(sw.rules.map((r) => ({ ...r })));
    setExpandedRule(null);
    setDialogOpen(true);
  };

  const openDuplicateDialog = (sw: SchrijfwijzerData) => {
    setEditingId(null);
    setFormName(`${sw.name} (kopie)`);
    setFormDescription(sw.description || "");
    setFormRules(sw.rules.map((r) => ({ ...r })));
    setExpandedRule(null);
    setDialogOpen(true);
  };

  const addRule = () => {
    const maxNumber = formRules.reduce((max, r) => Math.max(max, r.number), 0);
    setFormRules([
      ...formRules,
      { ...EMPTY_RULE, number: maxNumber + 1 },
    ]);
    setExpandedRule(formRules.length);
  };

  const updateRule = (index: number, updates: Partial<SchrijfwijzerRule>) => {
    setFormRules((prev) =>
      prev.map((r, i) => (i === index ? { ...r, ...updates } : r))
    );
  };

  const removeRule = (index: number) => {
    setFormRules((prev) => prev.filter((_, i) => i !== index));
    setExpandedRule(null);
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      toast.error("Vul een naam in.");
      return;
    }
    if (formRules.length === 0) {
      toast.error("Voeg minimaal één regel toe.");
      return;
    }
    const emptyRules = formRules.filter((r) => !r.title.trim());
    if (emptyRules.length > 0) {
      toast.error("Alle regels moeten een titel hebben.");
      return;
    }

    setSaving(true);
    try {
      if (editingId) {
        // Update existing
        const res = await fetch(`/api/schrijfwijzers/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formName,
            description: formDescription || undefined,
            rules: formRules,
          }),
        });
        if (!res.ok) throw new Error();
        toast.success("Schrijfwijzer bijgewerkt!");
      } else {
        // Create new
        const res = await fetch("/api/schrijfwijzers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formName,
            description: formDescription || undefined,
            rules: formRules,
          }),
        });
        if (!res.ok) throw new Error();
        toast.success("Schrijfwijzer aangemaakt!");
      }

      setDialogOpen(false);
      await loadSchrijfwijzers();
    } catch {
      toast.error("Kon schrijfwijzer niet opslaan.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/schrijfwijzers/${deleteId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      toast.success("Schrijfwijzer verwijderd!");
      setDeleteId(null);
      await loadSchrijfwijzers();
    } catch {
      toast.error("Kon schrijfwijzer niet verwijderen.");
    } finally {
      setDeleting(false);
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      const res = await fetch(`/api/schrijfwijzers/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDefault: true }),
      });
      if (!res.ok) throw new Error();
      toast.success("Standaard schrijfwijzer ingesteld!");
      await loadSchrijfwijzers();
    } catch {
      toast.error("Kon standaard niet instellen.");
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-[400px]" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <BookOpen className="size-5" />
            Schrijfwijzers
          </h1>
          <p className="text-sm text-muted-foreground">
            Beheer de schrijfwijzers voor je organisatie.
          </p>
        </div>

        <Button onClick={openCreateDialog}>
          <Plus className="size-4 mr-1.5" />
          Nieuwe schrijfwijzer
        </Button>
      </div>

      {schrijfwijzers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="size-12 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="font-medium mb-2">Geen schrijfwijzers</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Maak een eigen schrijfwijzer aan om te beginnen.
            </p>
            <Button onClick={openCreateDialog}>
              <Plus className="size-4 mr-1.5" />
              Nieuwe schrijfwijzer
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {schrijfwijzers.map((sw) => {
            const isExpanded = expandedCard === sw._id;
            const rulesByCategory = sw.rules.reduce(
              (acc, rule) => {
                if (!acc[rule.category]) acc[rule.category] = [];
                acc[rule.category].push(rule);
                return acc;
              },
              {} as Record<string, SchrijfwijzerRule[]>
            );

            return (
              <Card key={sw._id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div
                      className="flex items-center gap-3 cursor-pointer flex-1"
                      onClick={() =>
                        setExpandedCard(isExpanded ? null : sw._id)
                      }
                    >
                      <div className="flex-1">
                        <CardTitle className="text-lg flex items-center gap-2">
                          {sw.name}
                          {sw.isDefault && (
                            <Badge variant="secondary" className="text-xs">
                              <Star className="size-3 mr-1" />
                              Standaard
                            </Badge>
                          )}
                        </CardTitle>
                        {sw.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {sw.description}
                          </p>
                        )}
                      </div>
                      <Badge variant="outline">{sw.rules.length} regels</Badge>
                      {isExpanded ? (
                        <ChevronUp className="size-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="size-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex items-center gap-1 ml-3">
                      {!sw.isDefault && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSetDefault(sw._id)}
                          title="Instellen als standaard"
                        >
                          <Star className="size-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openDuplicateDialog(sw)}
                        title="Dupliceren"
                      >
                        <Copy className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(sw)}
                        title="Bewerken"
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteId(sw._id)}
                        title="Verwijderen"
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                {isExpanded && (
                  <CardContent className="pt-0">
                    <div className="border-t pt-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {CATEGORIES.map((category) => {
                          const rules = rulesByCategory[category];
                          if (!rules?.length) return null;
                          return (
                            <div key={category}>
                              <h4 className="text-xs font-medium text-muted-foreground uppercase mb-2">
                                {CATEGORY_LABELS[category]}
                              </h4>
                              <div className="space-y-2">
                                {rules.map((rule) => (
                                  <div
                                    key={rule.number}
                                    className="text-sm border rounded-md p-3"
                                  >
                                    <div className="flex items-center gap-2">
                                      <span className="text-muted-foreground font-mono text-xs">
                                        {rule.number}
                                      </span>
                                      <span className="font-medium">
                                        {rule.title}
                                      </span>
                                      {rule.mcpTools.length > 0 && (
                                        <Badge
                                          variant="outline"
                                          className="text-[9px] shrink-0"
                                        >
                                          Auto
                                        </Badge>
                                      )}
                                      <Badge
                                        variant="secondary"
                                        className="text-[9px] shrink-0 ml-auto"
                                      >
                                        Gewicht: {rule.weight}
                                      </Badge>
                                    </div>
                                    <p className="text-muted-foreground mt-1 text-xs">
                                      {rule.description}
                                    </p>
                                    {rule.exampleBefore && (
                                      <div className="mt-2 text-xs space-y-1">
                                        <div className="flex gap-2">
                                          <span className="text-red-500 shrink-0">
                                            Voor:
                                          </span>
                                          <span className="italic">
                                            {rule.exampleBefore}
                                          </span>
                                        </div>
                                        <div className="flex gap-2">
                                          <span className="text-green-600 shrink-0">
                                            Na:
                                          </span>
                                          <span className="italic">
                                            {rule.exampleAfter}
                                          </span>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Schrijfwijzer bewerken" : "Nieuwe schrijfwijzer"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Name & description */}
            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label htmlFor="sw-name">Naam *</Label>
                <Input
                  id="sw-name"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Bijv. Schrijfwijzer B1 2024"
                />
              </div>
              <div>
                <Label htmlFor="sw-desc">Beschrijving</Label>
                <Textarea
                  id="sw-desc"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Optionele beschrijving van deze schrijfwijzer..."
                  className="min-h-[60px]"
                />
              </div>
            </div>

            {/* Rules */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <Label>Regels ({formRules.length})</Label>
                <Button variant="outline" size="sm" onClick={addRule}>
                  <Plus className="size-3 mr-1" />
                  Regel toevoegen
                </Button>
              </div>

              <div className="space-y-2">
                {formRules.map((rule, index) => {
                  const isExpanded = expandedRule === index;
                  return (
                    <div
                      key={index}
                      className="border rounded-lg overflow-hidden"
                    >
                      {/* Rule header */}
                      <div
                        className="flex items-center gap-2 px-3 py-2 bg-muted/30 cursor-pointer"
                        onClick={() =>
                          setExpandedRule(isExpanded ? null : index)
                        }
                      >
                        <GripVertical className="size-3.5 text-muted-foreground shrink-0" />
                        <span className="text-xs text-muted-foreground font-mono w-6">
                          {rule.number}
                        </span>
                        <span className="text-sm font-medium flex-1 truncate">
                          {rule.title || "(naamloos)"}
                        </span>
                        <Badge variant="outline" className="text-[10px]">
                          {CATEGORY_LABELS[rule.category]}
                        </Badge>
                        {isExpanded ? (
                          <ChevronUp className="size-3.5 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="size-3.5 text-muted-foreground" />
                        )}
                      </div>

                      {/* Rule detail form */}
                      {isExpanded && (
                        <div className="p-3 space-y-3 border-t">
                          <div className="grid grid-cols-3 gap-3">
                            <div>
                              <Label className="text-xs">Nummer</Label>
                              <Input
                                type="number"
                                value={rule.number}
                                onChange={(e) =>
                                  updateRule(index, {
                                    number: parseInt(e.target.value) || 1,
                                  })
                                }
                                min={1}
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Categorie</Label>
                              <Select
                                value={rule.category}
                                onValueChange={(v) =>
                                  updateRule(index, {
                                    category: v as SchrijfwijzerCategory,
                                  })
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {CATEGORIES.map((cat) => (
                                    <SelectItem key={cat} value={cat}>
                                      {CATEGORY_LABELS[cat]}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label className="text-xs">
                                Gewicht (1-3)
                              </Label>
                              <Select
                                value={String(rule.weight)}
                                onValueChange={(v) =>
                                  updateRule(index, { weight: parseInt(v) })
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="1">1 - Laag</SelectItem>
                                  <SelectItem value="2">2 - Middel</SelectItem>
                                  <SelectItem value="3">3 - Hoog</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <div>
                            <Label className="text-xs">Titel *</Label>
                            <Input
                              value={rule.title}
                              onChange={(e) =>
                                updateRule(index, { title: e.target.value })
                              }
                              placeholder="Bijv. Schrijf korte zinnen"
                            />
                          </div>

                          <div>
                            <Label className="text-xs">Beschrijving *</Label>
                            <Textarea
                              value={rule.description}
                              onChange={(e) =>
                                updateRule(index, {
                                  description: e.target.value,
                                })
                              }
                              placeholder="Uitleg over deze regel..."
                              className="min-h-[60px]"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Label className="text-xs">
                                Voorbeeld voor (optioneel)
                              </Label>
                              <Textarea
                                value={rule.exampleBefore || ""}
                                onChange={(e) =>
                                  updateRule(index, {
                                    exampleBefore: e.target.value || undefined,
                                  })
                                }
                                placeholder="Fout voorbeeld..."
                                className="min-h-[50px] text-xs"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">
                                Voorbeeld na (optioneel)
                              </Label>
                              <Textarea
                                value={rule.exampleAfter || ""}
                                onChange={(e) =>
                                  updateRule(index, {
                                    exampleAfter: e.target.value || undefined,
                                  })
                                }
                                placeholder="Goed voorbeeld..."
                                className="min-h-[50px] text-xs"
                              />
                            </div>
                          </div>

                          <div>
                            <Label className="text-xs">
                              MCP-tools (komma-gescheiden, optioneel)
                            </Label>
                            <Input
                              value={rule.mcpTools.join(", ")}
                              onChange={(e) =>
                                updateRule(index, {
                                  mcpTools: e.target.value
                                    .split(",")
                                    .map((t) => t.trim())
                                    .filter(Boolean),
                                })
                              }
                              placeholder="Bijv. check_zinslengte, check_passief_taalgebruik"
                              className="text-xs"
                            />
                          </div>

                          <div className="flex justify-end">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeRule(index)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="size-3 mr-1" />
                              Regel verwijderen
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={saving}
            >
              Annuleren
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="size-4 mr-1.5 animate-spin" />}
              {editingId ? "Opslaan" : "Aanmaken"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Schrijfwijzer verwijderen?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Weet je zeker dat je deze schrijfwijzer wilt verwijderen? Dit kan
            niet ongedaan worden gemaakt.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteId(null)}
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

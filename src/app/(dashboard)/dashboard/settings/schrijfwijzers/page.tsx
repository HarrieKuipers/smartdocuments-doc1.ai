"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BookOpen, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { CATEGORY_LABELS } from "@/types/schrijfwijzer";
import type { SchrijfwijzerRule, SchrijfwijzerCategory } from "@/types/schrijfwijzer";

interface SchrijfwijzerData {
  _id: string;
  name: string;
  description?: string;
  rules: SchrijfwijzerRule[];
  isDefault: boolean;
  createdAt: string;
}

export default function SchrijfwijzerManagementPage() {
  const [schrijfwijzers, setSchrijfwijzers] = useState<SchrijfwijzerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);

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

  const seedDefault = async () => {
    setSeeding(true);
    try {
      const res = await fetch("/api/schrijfwijzers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seed: true }),
      });
      if (res.ok) {
        toast.success("Standaard schrijfwijzer aangemaakt!");
        await loadSchrijfwijzers();
      }
    } catch {
      toast.error("Kon schrijfwijzer niet aanmaken.");
    } finally {
      setSeeding(false);
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

        {schrijfwijzers.length === 0 && (
          <Button onClick={seedDefault} disabled={seeding}>
            {seeding ? (
              <Loader2 className="size-4 mr-1.5 animate-spin" />
            ) : (
              <Plus className="size-4 mr-1.5" />
            )}
            Standaard schrijfwijzer toevoegen
          </Button>
        )}
      </div>

      {schrijfwijzers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="size-12 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="font-medium mb-2">Geen schrijfwijzers</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Voeg de standaard NLA schrijfwijzer toe om te beginnen.
            </p>
            <Button onClick={seedDefault} disabled={seeding}>
              Standaard schrijfwijzer toevoegen
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {schrijfwijzers.map((sw) => {
            const rulesByCategory = sw.rules.reduce(
              (acc, rule) => {
                if (!acc[rule.category]) acc[rule.category] = [];
                acc[rule.category].push(rule);
                return acc;
              },
              {} as Record<SchrijfwijzerCategory, SchrijfwijzerRule[]>
            );

            return (
              <Card key={sw._id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{sw.name}</CardTitle>
                    <div className="flex items-center gap-2">
                      {sw.isDefault && (
                        <Badge variant="secondary">Standaard</Badge>
                      )}
                      <Badge variant="outline">{sw.rules.length} regels</Badge>
                    </div>
                  </div>
                  {sw.description && (
                    <p className="text-sm text-muted-foreground">
                      {sw.description}
                    </p>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {(
                      Object.entries(rulesByCategory) as [
                        SchrijfwijzerCategory,
                        SchrijfwijzerRule[],
                      ][]
                    ).map(([category, rules]) => (
                      <div key={category}>
                        <h4 className="text-xs font-medium text-muted-foreground uppercase mb-2">
                          {CATEGORY_LABELS[category]}
                        </h4>
                        <div className="space-y-1">
                          {rules.map((rule) => (
                            <div
                              key={rule.number}
                              className="text-sm flex items-center gap-1"
                            >
                              <span className="text-muted-foreground">
                                {rule.number}.
                              </span>
                              <span className="truncate">{rule.title}</span>
                              {rule.mcpTools.length > 0 && (
                                <Badge
                                  variant="outline"
                                  className="text-[9px] shrink-0"
                                >
                                  Auto
                                </Badge>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

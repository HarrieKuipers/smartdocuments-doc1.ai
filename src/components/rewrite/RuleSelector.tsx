"use client";

import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  REWRITE_PRESETS,
  DEFAULT_SELECTED_RULES,
} from "@/types/rewrite";
import { CATEGORY_LABELS } from "@/types/schrijfwijzer";
import type { SchrijfwijzerRule, SchrijfwijzerCategory } from "@/types/schrijfwijzer";

interface RuleSelectorProps {
  rules: SchrijfwijzerRule[];
  selectedRules: number[];
  onSelectedRulesChange: (rules: number[]) => void;
  onPresetSelect?: (presetId: string) => void;
  disabled?: boolean;
}

export default function RuleSelector({
  rules,
  selectedRules,
  onSelectedRulesChange,
  onPresetSelect,
  disabled = false,
}: RuleSelectorProps) {
  const [activePreset, setActivePreset] = useState<string | null>(null);

  // Group rules by category
  const groupedRules = rules.reduce(
    (acc, rule) => {
      if (!acc[rule.category]) acc[rule.category] = [];
      acc[rule.category].push(rule);
      return acc;
    },
    {} as Record<SchrijfwijzerCategory, SchrijfwijzerRule[]>
  );

  const categoryOrder: SchrijfwijzerCategory[] = [
    "voorbereiding",
    "structuur",
    "zinnen",
    "woorden",
  ];

  const toggleRule = (ruleNumber: number) => {
    if (disabled) return;
    setActivePreset(null);
    if (selectedRules.includes(ruleNumber)) {
      onSelectedRulesChange(selectedRules.filter((r) => r !== ruleNumber));
    } else {
      onSelectedRulesChange([...selectedRules, ruleNumber]);
    }
  };

  const applyPreset = (presetId: string) => {
    if (disabled) return;
    const preset = REWRITE_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setActivePreset(presetId);
    onSelectedRulesChange(preset.rules);
    onPresetSelect?.(presetId);
  };

  const resetToDefaults = () => {
    setActivePreset(null);
    onSelectedRulesChange(DEFAULT_SELECTED_RULES);
  };

  return (
    <div className="space-y-6">
      {/* Presets */}
      <div>
        <h3 className="text-sm font-medium mb-3">Snelkeuze</h3>
        <div className="flex flex-wrap gap-2">
          {REWRITE_PRESETS.map((preset) => (
            <Button
              key={preset.id}
              variant={activePreset === preset.id ? "default" : "outline"}
              size="sm"
              onClick={() => applyPreset(preset.id)}
              disabled={disabled}
            >
              {preset.name}
            </Button>
          ))}
          <Button
            variant="ghost"
            size="sm"
            onClick={resetToDefaults}
            disabled={disabled}
          >
            Standaard
          </Button>
        </div>
      </div>

      {/* Rules grouped by category */}
      {categoryOrder.map((category) => {
        const categoryRules = groupedRules[category];
        if (!categoryRules?.length) return null;

        const isVoorbereiding = category === "voorbereiding";

        return (
          <div key={category}>
            <div className="flex items-center gap-2 mb-3">
              <h3 className="text-sm font-medium">
                {CATEGORY_LABELS[category]}
              </h3>
              {isVoorbereiding && (
                <Badge variant="secondary" className="text-xs">
                  Niet van toepassing
                </Badge>
              )}
              <Badge variant="outline" className="text-xs">
                {categoryRules.filter((r) => selectedRules.includes(r.number)).length}
                /{categoryRules.length}
              </Badge>
            </div>

            <div className="space-y-2">
              {categoryRules.map((rule) => (
                <label
                  key={rule.number}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedRules.includes(rule.number)
                      ? "border-primary/30 bg-primary/5"
                      : "border-border hover:bg-muted/50"
                  } ${isVoorbereiding ? "opacity-50" : ""} ${
                    disabled ? "pointer-events-none opacity-50" : ""
                  }`}
                >
                  <Checkbox
                    checked={selectedRules.includes(rule.number)}
                    onCheckedChange={() => toggleRule(rule.number)}
                    disabled={disabled || isVoorbereiding}
                    className="mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {rule.number}. {rule.title}
                      </span>
                      {rule.weight >= 3 && (
                        <Badge variant="destructive" className="text-[10px]">
                          Hoge impact
                        </Badge>
                      )}
                      {rule.mcpTools.length > 0 && (
                        <Badge variant="outline" className="text-[10px]">
                          Auto-check
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {rule.description}
                    </p>
                    {rule.exampleBefore && rule.exampleAfter && (
                      <div className="mt-2 text-xs space-y-1">
                        <div className="text-red-600 line-through">
                          {rule.exampleBefore}
                        </div>
                        <div className="text-green-600">
                          {rule.exampleAfter}
                        </div>
                      </div>
                    )}
                  </div>
                </label>
              ))}
            </div>
          </div>
        );
      })}

      {/* Summary */}
      <div className="flex items-center justify-between pt-4 border-t">
        <span className="text-sm text-muted-foreground">
          {selectedRules.length} regels geselecteerd
        </span>
      </div>
    </div>
  );
}

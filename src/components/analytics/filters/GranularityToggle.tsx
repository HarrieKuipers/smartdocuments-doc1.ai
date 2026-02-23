"use client";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

export type Granularity = "hour" | "day" | "week" | "month";

interface GranularityToggleProps {
  value: Granularity;
  onChange: (granularity: Granularity) => void;
}

const options: { label: string; value: Granularity }[] = [
  { label: "Uur", value: "hour" },
  { label: "Dag", value: "day" },
  { label: "Week", value: "week" },
  { label: "Maand", value: "month" },
];

export default function GranularityToggle({
  value,
  onChange,
}: GranularityToggleProps) {
  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(v) => {
        if (v) onChange(v as Granularity);
      }}
      className="gap-0 rounded-lg border bg-gray-50 p-0.5"
    >
      {options.map((opt) => (
        <ToggleGroupItem
          key={opt.value}
          value={opt.value}
          className="h-7 rounded-md px-3 text-xs font-medium data-[state=on]:bg-white data-[state=on]:shadow-sm"
        >
          {opt.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

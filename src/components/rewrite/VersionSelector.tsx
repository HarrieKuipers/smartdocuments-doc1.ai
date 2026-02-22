"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { RewriteVersion } from "@/types/rewrite";

interface VersionSelectorProps {
  versions: RewriteVersion[];
  activeVersion: number;
  onVersionChange: (versionNumber: number) => void;
}

export default function VersionSelector({
  versions,
  activeVersion,
  onVersionChange,
}: VersionSelectorProps) {
  if (versions.length <= 1) return null;

  return (
    <Select
      value={String(activeVersion)}
      onValueChange={(v) => onVersionChange(Number(v))}
    >
      <SelectTrigger className="w-[160px]">
        <SelectValue placeholder="Versie kiezen" />
      </SelectTrigger>
      <SelectContent>
        {versions
          .sort((a, b) => b.versionNumber - a.versionNumber)
          .map((version) => (
            <SelectItem
              key={version.versionNumber}
              value={String(version.versionNumber)}
            >
              Versie {version.versionNumber}
              {version.versionNumber === activeVersion && " (actief)"}
            </SelectItem>
          ))}
      </SelectContent>
    </Select>
  );
}

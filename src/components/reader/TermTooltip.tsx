"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface TermTooltipProps {
  term: string;
  definition: string;
}

export default function TermTooltip({ term, definition }: TermTooltipProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="cursor-help border-b border-dotted border-[var(--brand-primary,#0062EB)] text-[var(--brand-primary,#0062EB)]">
          {term}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        <p className="font-medium">{term}</p>
        <p className="text-xs text-muted-foreground">{definition}</p>
      </TooltipContent>
    </Tooltip>
  );
}

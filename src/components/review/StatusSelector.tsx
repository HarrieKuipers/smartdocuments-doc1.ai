"use client";

import { Button } from "@/components/ui/button";
import { CheckCircle2, RefreshCw, XCircle } from "lucide-react";

interface StatusSelectorProps {
  onStatusSelect: (
    status: "approved" | "approved_with_changes" | "rejected"
  ) => void;
  disabled?: boolean;
}

export default function StatusSelector({
  onStatusSelect,
  disabled = false,
}: StatusSelectorProps) {
  return (
    <div className="space-y-3">
      <h3 className="font-medium text-sm">Beoordeling</h3>
      <div className="grid gap-2">
        <Button
          variant="outline"
          className="justify-start h-auto py-3 px-4 hover:bg-green-50 hover:border-green-300"
          onClick={() => onStatusSelect("approved")}
          disabled={disabled}
        >
          <CheckCircle2 className="size-5 text-green-600 mr-3 shrink-0" />
          <div className="text-left">
            <div className="font-medium">Akkoord</div>
            <div className="text-xs text-muted-foreground">
              Document is goedgekeurd voor gebruik
            </div>
          </div>
        </Button>

        <Button
          variant="outline"
          className="justify-start h-auto py-3 px-4 hover:bg-orange-50 hover:border-orange-300"
          onClick={() => onStatusSelect("approved_with_changes")}
          disabled={disabled}
        >
          <RefreshCw className="size-5 text-orange-600 mr-3 shrink-0" />
          <div className="text-left">
            <div className="font-medium">Akkoord met aanpassingen</div>
            <div className="text-xs text-muted-foreground">
              Goedgekeurd, maar met opmerkingen
            </div>
          </div>
        </Button>

        <Button
          variant="outline"
          className="justify-start h-auto py-3 px-4 hover:bg-red-50 hover:border-red-300"
          onClick={() => onStatusSelect("rejected")}
          disabled={disabled}
        >
          <XCircle className="size-5 text-red-600 mr-3 shrink-0" />
          <div className="text-left">
            <div className="font-medium">Niet akkoord</div>
            <div className="text-xs text-muted-foreground">
              Niet goedgekeurd, revisie nodig
            </div>
          </div>
        </Button>
      </div>
    </div>
  );
}

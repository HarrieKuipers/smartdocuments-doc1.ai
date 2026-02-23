"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";

interface DateRangePickerProps {
  startDate?: string;
  endDate?: string;
  onChange: (start: string, end: string) => void;
}

export default function DateRangePicker({
  startDate,
  endDate,
  onChange,
}: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const [start, setStart] = useState(startDate || "");
  const [end, setEnd] = useState(endDate || "");

  function handleApply() {
    if (start && end) {
      onChange(start, end);
      setOpen(false);
    }
  }

  const displayLabel =
    startDate && endDate
      ? `${format(new Date(startDate), "d MMM", { locale: nl })} - ${format(new Date(endDate), "d MMM yyyy", { locale: nl })}`
      : "Aangepast bereik";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 text-sm">
          <Calendar className="h-3.5 w-3.5" />
          {displayLabel}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-4" align="end">
        <div className="space-y-3">
          <p className="text-sm font-medium text-gray-700">Selecteer periode</p>
          <div className="space-y-2">
            <div>
              <label className="text-xs text-gray-500">Van</label>
              <Input
                type="date"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                className="h-8 text-sm"
                max={end || undefined}
              />
            </div>
            <div>
              <label className="text-xs text-gray-500">Tot</label>
              <Input
                type="date"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                className="h-8 text-sm"
                min={start || undefined}
                max={format(new Date(), "yyyy-MM-dd")}
              />
            </div>
          </div>
          <Button
            size="sm"
            className="w-full"
            onClick={handleApply}
            disabled={!start || !end}
          >
            Toepassen
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

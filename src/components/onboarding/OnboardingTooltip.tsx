"use client";

import { useEffect, useRef, useState } from "react";
import { X, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface OnboardingTooltipProps {
  show: boolean;
  title: string;
  description: string;
  onNext?: () => void;
  onDismiss?: () => void;
  position?: "top" | "bottom" | "left" | "right";
  showNextButton?: boolean;
  nextLabel?: string;
  step?: string;
  children: React.ReactNode;
}

export default function OnboardingTooltip({
  show,
  title,
  description,
  onNext,
  onDismiss,
  position = "right",
  showNextButton = true,
  nextLabel = "Volgende",
  children,
}: OnboardingTooltipProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => setVisible(true), 100);
      return () => clearTimeout(timer);
    } else {
      setVisible(false);
    }
  }, [show]);

  const positionClasses = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-3",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-3",
    left: "right-full top-1/2 -translate-y-1/2 mr-3",
    right: "left-full top-1/2 -translate-y-1/2 ml-3",
  };

  const arrowClasses = {
    top: "top-full left-1/2 -translate-x-1/2 border-t-[#0062EB] border-l-transparent border-r-transparent border-b-transparent",
    bottom:
      "bottom-full left-1/2 -translate-x-1/2 border-b-[#0062EB] border-l-transparent border-r-transparent border-t-transparent",
    left: "left-full top-1/2 -translate-y-1/2 border-l-[#0062EB] border-t-transparent border-b-transparent border-r-transparent",
    right:
      "right-full top-1/2 -translate-y-1/2 border-r-[#0062EB] border-t-transparent border-b-transparent border-l-transparent",
  };

  return (
    <div ref={ref} className="relative">
      {/* Highlight ring around child */}
      <div
        className={cn(
          "transition-all duration-300",
          show && "rounded-lg ring-2 ring-[#0062EB] ring-offset-2"
        )}
      >
        {children}
      </div>

      {/* Tooltip */}
      {show && visible && (
        <div
          className={cn(
            "absolute z-[60] w-72 animate-in fade-in slide-in-from-bottom-2 duration-200",
            positionClasses[position]
          )}
        >
          <div className="rounded-lg bg-[#0062EB] p-4 text-white shadow-lg">
            <div className="mb-1 flex items-start justify-between">
              <h4 className="text-sm font-semibold">{title}</h4>
              {onDismiss && (
                <button
                  onClick={onDismiss}
                  className="ml-2 rounded p-0.5 hover:bg-white/20 transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <p className="text-xs text-blue-100 leading-relaxed">
              {description}
            </p>
            {showNextButton && onNext && (
              <button
                onClick={onNext}
                className="mt-3 flex items-center gap-1 rounded bg-white/20 px-3 py-1.5 text-xs font-medium hover:bg-white/30 transition-colors"
              >
                {nextLabel}
                <ArrowRight className="h-3 w-3" />
              </button>
            )}
          </div>
          {/* Arrow */}
          <div
            className={cn(
              "absolute h-0 w-0 border-[6px]",
              arrowClasses[position]
            )}
          />
        </div>
      )}
    </div>
  );
}

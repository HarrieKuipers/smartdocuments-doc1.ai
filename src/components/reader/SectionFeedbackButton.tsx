"use client";

import { useState, useEffect, useCallback } from "react";
import { MessageSquare, ThumbsUp, ThumbsDown, Check } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type FeedbackType = "helpful" | "unclear" | "too-complex" | "too-simple";

interface SectionFeedbackButtonProps {
  shortId: string;
  sectionType: "summary" | "keyPoint" | "finding" | "term";
  sectionIndex?: number;
  sectionTitle?: string;
  sessionId: string;
}

const FEEDBACK_OPTIONS: {
  type: FeedbackType;
  label: string;
  icon: React.ReactNode;
}[] = [
  { type: "helpful", label: "Duidelijk", icon: <ThumbsUp className="h-3.5 w-3.5" /> },
  { type: "unclear", label: "Onduidelijk", icon: <ThumbsDown className="h-3.5 w-3.5" /> },
  { type: "too-complex", label: "Te complex", icon: null },
  { type: "too-simple", label: "Te eenvoudig", icon: null },
];

function getStorageKey(
  shortId: string,
  sectionType: string,
  sectionIndex?: number
): string {
  const indexPart = sectionIndex !== undefined ? `-${sectionIndex}` : "";
  return `doc1-feedback-${shortId}-${sectionType}${indexPart}`;
}

export default function SectionFeedbackButton({
  shortId,
  sectionType,
  sectionIndex,
  sectionTitle,
  sessionId,
}: SectionFeedbackButtonProps) {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedType, setSelectedType] = useState<FeedbackType | null>(null);
  const [comment, setComment] = useState("");
  const [open, setOpen] = useState(false);
  const [showThankYou, setShowThankYou] = useState(false);

  const storageKey = getStorageKey(shortId, sectionType, sectionIndex);

  useEffect(() => {
    try {
      const submitted = localStorage.getItem(storageKey);
      if (submitted) {
        setIsSubmitted(true);
      }
    } catch {
      // localStorage not available
    }
  }, [storageKey]);

  const handleSubmit = useCallback(async () => {
    if (!selectedType || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/reader/${shortId}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sectionType,
          sectionIndex,
          sectionTitle,
          feedbackType: selectedType,
          comment: comment.trim() || undefined,
          sessionId,
        }),
      });

      if (res.ok) {
        try {
          localStorage.setItem(storageKey, "true");
        } catch {
          // localStorage not available
        }
        setIsSubmitted(true);
        setShowThankYou(true);
        setTimeout(() => {
          setOpen(false);
          setShowThankYou(false);
        }, 1500);
      }
    } catch (error) {
      console.error("Feedback submit error:", error);
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedType, isSubmitting, shortId, sectionType, sectionIndex, sectionTitle, comment, sessionId, storageKey]);

  const handleQuickFeedback = useCallback(async (type: FeedbackType) => {
    setSelectedType(type);
  }, []);

  if (isSubmitted && !showThankYou) {
    return null;
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="inline-flex items-center justify-center rounded-md p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground group-hover:opacity-100 focus:opacity-100"
          aria-label="Geef feedback op deze sectie"
        >
          <MessageSquare className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72" sideOffset={8}>
        {showThankYou ? (
          <div className="flex flex-col items-center gap-2 py-3">
            <Check className="h-6 w-6 text-green-500" />
            <p className="text-sm font-medium">Bedankt voor je feedback!</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-sm font-medium">Wat vind je van deze sectie?</p>

            <div className="grid grid-cols-2 gap-1.5">
              {FEEDBACK_OPTIONS.map((option) => (
                <Button
                  key={option.type}
                  variant={selectedType === option.type ? "default" : "outline"}
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => handleQuickFeedback(option.type)}
                >
                  {option.icon && <span className="mr-1">{option.icon}</span>}
                  {option.label}
                </Button>
              ))}
            </div>

            {selectedType && (
              <>
                <Textarea
                  placeholder="Toelichting (optioneel)"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="min-h-[60px] resize-none text-xs"
                  maxLength={1000}
                />
                <Button
                  size="sm"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="w-full"
                >
                  {isSubmitting ? "Verzenden..." : "Verstuur feedback"}
                </Button>
              </>
            )}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

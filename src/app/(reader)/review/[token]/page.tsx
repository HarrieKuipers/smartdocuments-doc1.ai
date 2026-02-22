"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, Lock, Send, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import B1ScoreBadge from "@/components/rewrite/B1ScoreBadge";
import FeedbackSidebar from "@/components/review/FeedbackSidebar";
import StatusSelector from "@/components/review/StatusSelector";
import type { ContentDiff } from "@/types/rewrite";
import type { FeedbackType } from "@/types/review";

interface ReviewData {
  document: {
    title: string;
    organizationId?: {
      name: string;
      logo?: string;
    };
  };
  content: string;
  originalContent: string;
  diffs: ContentDiff[];
  b1Score: number;
  status: string;
  feedback: Array<unknown>;
  generalFeedback?: string;
  versionNumber: number;
}

interface FeedbackItem {
  sectionId: string;
  sectionTitle: string;
  comment: string;
  type: FeedbackType;
}

export default function ClientReviewPage() {
  const params = useParams();
  const token = params.token as string;

  const [loading, setLoading] = useState(true);
  const [requiresPin, setRequiresPin] = useState(false);
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [reviewData, setReviewData] = useState<ReviewData | null>(null);
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [generalFeedback, setGeneralFeedback] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    loadReview();
  }, [token]);

  const loadReview = async (pinCode?: string) => {
    setLoading(true);
    setError(null);

    try {
      const url = pinCode
        ? `/api/review/${token}?pin=${encodeURIComponent(pinCode)}`
        : `/api/review/${token}`;
      const res = await fetch(url);

      if (!res.ok) {
        const data = await res.json();
        if (data.requiresPin) {
          setRequiresPin(true);
          setLoading(false);
          return;
        }
        setError(data.error || "Kon review niet laden.");
        setLoading(false);
        return;
      }

      const { data } = await res.json();
      setReviewData(data);
      setRequiresPin(false);
    } catch {
      setError("Kon review niet laden.");
    } finally {
      setLoading(false);
    }
  };

  const sections = useMemo(() => {
    if (!reviewData) return [];
    const lines = reviewData.content.split("\n");
    return lines
      .filter((line) => line.match(/^#{1,4}\s+/))
      .map((line) => {
        const match = line.match(/^(#{1,4})\s+(.+)$/);
        if (!match) return null;
        return {
          id: match[2].toLowerCase().replace(/\s+/g, "-"),
          title: match[2],
        };
      })
      .filter(Boolean) as Array<{ id: string; title: string }>;
  }, [reviewData]);

  const handleSubmitFeedback = async () => {
    if (!authorName.trim()) {
      toast.error("Vul je naam in.");
      return;
    }

    setSubmitting(true);
    try {
      // Submit feedback
      if (feedback.length > 0 || generalFeedback) {
        const res = await fetch(`/api/review/${token}/feedback`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            feedback,
            generalFeedback: generalFeedback || undefined,
            author: authorName,
          }),
        });
        if (!res.ok) throw new Error("Kon feedback niet versturen.");
      }
    } catch {
      toast.error("Kon feedback niet versturen.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusSelect = async (
    status: "approved" | "approved_with_changes" | "rejected"
  ) => {
    if (!authorName.trim()) {
      toast.error("Vul je naam in.");
      return;
    }

    setSubmitting(true);
    try {
      // Submit feedback first
      if (feedback.length > 0 || generalFeedback) {
        await fetch(`/api/review/${token}/feedback`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            feedback,
            generalFeedback: generalFeedback || undefined,
            author: authorName,
          }),
        });
      }

      // Then submit status
      const res = await fetch(`/api/review/${token}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (!res.ok) throw new Error("Kon status niet versturen.");

      setSubmitted(true);
      toast.success("Feedback verstuurd!");
    } catch {
      toast.error("Kon review niet versturen.");
    } finally {
      setSubmitting(false);
    }
  };

  // Pin entry screen
  if (requiresPin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <Lock className="size-8 mx-auto mb-2 text-muted-foreground" />
            <CardTitle>Pincode vereist</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="Voer pincode in"
              onKeyDown={(e) => {
                if (e.key === "Enter") loadReview(pin);
              }}
            />
            <Button
              className="w-full"
              onClick={() => loadReview(pin)}
              disabled={!pin}
            >
              Openen
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Loading
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-5xl mx-auto space-y-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-[600px]" />
        </div>
      </div>
    );
  }

  // Error
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-sm">
          <CardContent className="pt-6 text-center">
            <p className="text-destructive">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Submitted confirmation
  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-sm">
          <CardContent className="pt-6 text-center space-y-3">
            <CheckCircle2 className="size-12 mx-auto text-green-600" />
            <h2 className="text-lg font-semibold">Bedankt!</h2>
            <p className="text-sm text-muted-foreground">
              Je feedback is verstuurd. Het team zal je opmerkingen verwerken.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!reviewData) return null;

  const orgName = reviewData.document.organizationId?.name;
  const orgLogo = reviewData.document.organizationId?.logo;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            {orgLogo && (
              <img src={orgLogo} alt={orgName || ""} className="h-8 w-auto" />
            )}
            <div>
              <h1 className="font-semibold">{reviewData.document.title}</h1>
              {orgName && (
                <span className="text-sm text-muted-foreground">{orgName}</span>
              )}
            </div>
          </div>
          <B1ScoreBadge score={reviewData.b1Score} />
        </div>
      </header>

      {/* Content + sidebar */}
      <div className="max-w-5xl mx-auto p-6 flex gap-6">
        {/* Main document */}
        <div className="flex-1 min-w-0">
          <Card>
            <CardContent className="p-6">
              <div
                className="prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{
                  __html: formatContent(reviewData.content),
                }}
              />
            </CardContent>
          </Card>
        </div>

        {/* Review sidebar */}
        <div className="w-80 shrink-0 space-y-6">
          {/* Author name */}
          <div>
            <Label>Je naam</Label>
            <Input
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              placeholder="Je naam"
            />
          </div>

          {/* Section feedback */}
          <FeedbackSidebar
            sections={sections}
            feedback={feedback}
            onFeedbackChange={setFeedback}
          />

          {/* General feedback */}
          <div>
            <Label>Algemene feedback</Label>
            <Textarea
              value={generalFeedback}
              onChange={(e) => setGeneralFeedback(e.target.value)}
              placeholder="Schrijf je algemene opmerkingen..."
              className="min-h-[100px]"
            />
          </div>

          {/* Status selection */}
          <StatusSelector
            onStatusSelect={handleStatusSelect}
            disabled={submitting || !authorName.trim()}
          />

          {submitting && (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Versturen...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function formatContent(text: string): string {
  return text
    .split("\n")
    .map((line) => {
      const headingMatch = line.match(/^(#{1,4})\s+(.+)$/);
      if (headingMatch) {
        const level = headingMatch[1].length;
        const id = headingMatch[2].toLowerCase().replace(/\s+/g, "-");
        const sizes = ["text-2xl", "text-xl", "text-lg", "text-base"];
        return `<h${level} id="${id}" class="font-bold ${sizes[level - 1]} mt-6 mb-3">${headingMatch[2]}</h${level}>`;
      }
      if (line.match(/^[-*]\s+/)) {
        return `<li class="ml-4 mb-1">${line.replace(/^[-*]\s+/, "")}</li>`;
      }
      if (line.match(/^\d+\.\s+/)) {
        return `<li class="ml-4 mb-1 list-decimal">${line.replace(/^\d+\.\s+/, "")}</li>`;
      }
      if (line.trim() === "") return "<br />";
      return `<p class="mb-2 leading-relaxed">${line}</p>`;
    })
    .join("");
}

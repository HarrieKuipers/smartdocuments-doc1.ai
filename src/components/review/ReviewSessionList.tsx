"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy, ExternalLink, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface ReviewSessionItem {
  _id: string;
  token: string;
  reviewerName?: string;
  reviewerEmail?: string;
  status: string;
  feedback: Array<unknown>;
  openedAt?: string;
  submittedAt?: string;
  expiresAt: string;
  createdAt: string;
}

interface ReviewSessionListProps {
  rewriteId: string;
}

const STATUS_BADGE: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Wacht op review", variant: "outline" },
  in_progress: { label: "In review", variant: "secondary" },
  approved: { label: "Akkoord", variant: "default" },
  approved_with_changes: { label: "Akkoord met aanpassingen", variant: "secondary" },
  rejected: { label: "Niet akkoord", variant: "destructive" },
};

export default function ReviewSessionList({
  rewriteId,
}: ReviewSessionListProps) {
  const [sessions, setSessions] = useState<ReviewSessionItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSessions();
  }, [rewriteId]);

  const fetchSessions = async () => {
    try {
      const res = await fetch(`/api/rewrites/${rewriteId}/review-sessions`);
      if (res.ok) {
        const { data } = await res.json();
        setSessions(data);
      }
    } catch {
      toast.error("Kon review-sessies niet laden.");
    } finally {
      setLoading(false);
    }
  };

  const copyLink = (token: string) => {
    const url = `${window.location.origin}/review/${token}`;
    navigator.clipboard.writeText(url);
    toast.success("Link gekopieerd!");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-muted-foreground">
        Nog geen review-links aangemaakt.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sessions.map((session) => {
        const isExpired = new Date(session.expiresAt) < new Date();
        const statusInfo = STATUS_BADGE[session.status] || STATUS_BADGE.pending;

        return (
          <div
            key={session._id}
            className={`p-4 border rounded-lg ${isExpired ? "opacity-50" : ""}`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {session.reviewerName && (
                  <span className="font-medium text-sm">
                    {session.reviewerName}
                  </span>
                )}
                {session.reviewerEmail && (
                  <span className="text-xs text-muted-foreground">
                    {session.reviewerEmail}
                  </span>
                )}
                {!session.reviewerName && !session.reviewerEmail && (
                  <span className="text-sm text-muted-foreground">
                    Anonieme reviewer
                  </span>
                )}
              </div>
              <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
            </div>

            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-4">
                <span>
                  Aangemaakt:{" "}
                  {new Date(session.createdAt).toLocaleDateString("nl-NL")}
                </span>
                {isExpired ? (
                  <span className="text-destructive">Verlopen</span>
                ) : (
                  <span>
                    Verloopt:{" "}
                    {new Date(session.expiresAt).toLocaleDateString("nl-NL")}
                  </span>
                )}
                {session.feedback?.length > 0 && (
                  <span>{session.feedback.length} feedbackpunten</span>
                )}
              </div>

              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2"
                  onClick={() => copyLink(session.token)}
                  disabled={isExpired}
                >
                  <Copy className="size-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2"
                  onClick={() =>
                    window.open(`/review/${session.token}`, "_blank")
                  }
                  disabled={isExpired}
                >
                  <ExternalLink className="size-3.5" />
                </Button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

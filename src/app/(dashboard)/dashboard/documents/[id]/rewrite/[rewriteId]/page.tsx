"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  Edit3,
  Eye,
  Loader2,
  Share2,
  FileCheck,
  MessageSquare,
} from "lucide-react";
import { toast } from "sonner";
import RewriteWebview from "@/components/rewrite/RewriteWebview";
import PageEditor from "@/components/rewrite/PageEditor";
import ShareModal from "@/components/review/ShareModal";
import ReviewSessionList from "@/components/review/ReviewSessionList";
import FeedbackList from "@/components/review/FeedbackList";
import StatusBadge from "@/components/shared/StatusBadge";
import type { DocumentRewriteStatus, RewriteVersion, ContentDiff } from "@/types/rewrite";
import type { SectionFeedback } from "@/types/review";

interface RewriteData {
  _id: string;
  documentId: { _id: string; title: string; shortId: string; slug: string };
  organizationId: string;
  schrijfwijzerId: { _id: string; name: string };
  selectedRules: number[];
  versions: RewriteVersion[];
  activeVersionNumber: number;
  status: DocumentRewriteStatus;
}

export default function RewriteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const documentId = params.id as string;
  const rewriteId = params.rewriteId as string;

  const [loading, setLoading] = useState(true);
  const [rewrite, setRewrite] = useState<RewriteData | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("preview");
  const [feedback, setFeedback] = useState<SectionFeedback[]>([]);

  useEffect(() => {
    loadRewrite();
    loadFeedback();
  }, [rewriteId]);

  const loadRewrite = async () => {
    try {
      const res = await fetch(`/api/rewrites/${rewriteId}`);
      if (!res.ok) throw new Error("Kon rewrite niet laden.");
      const { data } = await res.json();
      setRewrite(data);
    } catch {
      toast.error("Kon rewrite niet laden.");
    } finally {
      setLoading(false);
    }
  };

  const loadFeedback = async () => {
    try {
      const res = await fetch(`/api/rewrites/${rewriteId}/review-sessions`);
      if (res.ok) {
        const { data: sessions } = await res.json();
        const allFeedback: SectionFeedback[] = [];
        for (const session of sessions) {
          if (session.feedback) {
            allFeedback.push(...session.feedback);
          }
        }
        setFeedback(allFeedback);
      }
    } catch {
      // Non-blocking
    }
  };

  const handleSave = async (content: string) => {
    const res = await fetch(`/api/rewrites/${rewriteId}/content`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    if (!res.ok) throw new Error("Kon niet opslaan.");
    await loadRewrite();
  };

  const handlePublish = async () => {
    const res = await fetch(`/api/rewrites/${rewriteId}/publish`, {
      method: "POST",
    });
    if (!res.ok) {
      const data = await res.json();
      toast.error(data.error || "Kon niet publiceren.");
      return;
    }
    toast.success("Document gepubliceerd!");
    await loadRewrite();
  };

  if (loading || !rewrite) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-[600px]" />
      </div>
    );
  }

  const activeVersion = rewrite.versions.find(
    (v) => v.versionNumber === rewrite.activeVersionNumber
  );

  const title =
    typeof rewrite.documentId === "object"
      ? rewrite.documentId.title
      : "Document";

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="size-4 mr-1.5" />
            Terug
          </Button>
          <div>
            <h1 className="text-xl font-semibold">{title}</h1>
            <p className="text-sm text-muted-foreground">
              Herschreven met{" "}
              {typeof rewrite.schrijfwijzerId === "object"
                ? rewrite.schrijfwijzerId.name
                : "schrijfwijzer"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <StatusBadge status={rewrite.status} />

          {["rewritten", "editing", "approved_with_changes"].includes(
            rewrite.status
          ) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShareOpen(true)}
            >
              <Share2 className="size-4 mr-1.5" />
              Deel voor review
            </Button>
          )}

          {["rewritten", "approved", "approved_with_changes", "editing"].includes(
            rewrite.status
          ) && (
            <Button size="sm" onClick={handlePublish}>
              <FileCheck className="size-4 mr-1.5" />
              Publiceren
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="preview">
            <Eye className="size-4 mr-1.5" />
            Voorbeeld
          </TabsTrigger>
          <TabsTrigger value="editor">
            <Edit3 className="size-4 mr-1.5" />
            Editor
          </TabsTrigger>
          <TabsTrigger value="feedback">
            <MessageSquare className="size-4 mr-1.5" />
            Feedback
            {feedback.length > 0 && (
              <span className="ml-1.5 bg-primary text-primary-foreground rounded-full px-1.5 py-0.5 text-[10px]">
                {feedback.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="reviews">
            <Share2 className="size-4 mr-1.5" />
            Reviews
          </TabsTrigger>
        </TabsList>

        <TabsContent value="preview" className="mt-4">
          <RewriteWebview
            title={title}
            versions={rewrite.versions}
            activeVersionNumber={rewrite.activeVersionNumber}
            status={rewrite.status}
            onVersionChange={async (v) => {
              // Could update active version via API
            }}
          />
        </TabsContent>

        <TabsContent value="editor" className="mt-4">
          {activeVersion ? (
            <div className="border rounded-lg overflow-hidden h-[700px]">
              <PageEditor
                rewriteId={rewriteId}
                content={activeVersion.content}
                diffs={activeVersion.diffs}
                b1Score={activeVersion.b1Score}
                status={rewrite.status}
                feedback={feedback}
                onSave={handleSave}
              />
            </div>
          ) : (
            <p className="text-muted-foreground">Geen versie beschikbaar.</p>
          )}
        </TabsContent>

        <TabsContent value="feedback" className="mt-4">
          <div className="max-w-2xl">
            <FeedbackList feedback={feedback} />
          </div>
        </TabsContent>

        <TabsContent value="reviews" className="mt-4">
          <div className="max-w-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Review-links</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShareOpen(true)}
              >
                <Share2 className="size-4 mr-1.5" />
                Nieuwe link
              </Button>
            </div>
            <ReviewSessionList rewriteId={rewriteId} />
          </div>
        </TabsContent>
      </Tabs>

      <ShareModal
        open={shareOpen}
        onOpenChange={setShareOpen}
        rewriteId={rewriteId}
      />
    </div>
  );
}

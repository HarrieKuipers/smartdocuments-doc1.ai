"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Copy, Mail, Link2, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ShareModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rewriteId: string;
}

export default function ShareModal({
  open,
  onOpenChange,
  rewriteId,
}: ShareModalProps) {
  const [reviewerName, setReviewerName] = useState("");
  const [reviewerEmail, setReviewerEmail] = useState("");
  const [usePin, setUsePin] = useState(false);
  const [pin, setPin] = useState("");
  const [expiresInDays, setExpiresInDays] = useState(30);
  const [loading, setLoading] = useState(false);
  const [reviewUrl, setReviewUrl] = useState<string | null>(null);

  const handleCreate = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/rewrites/${rewriteId}/review-sessions`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reviewerName: reviewerName || undefined,
            reviewerEmail: reviewerEmail || undefined,
            pin: usePin && pin ? pin : undefined,
            expiresInDays,
          }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Kon review-link niet aanmaken.");
      }

      const { data } = await response.json();
      const fullUrl = `${window.location.origin}${data.reviewUrl}`;
      setReviewUrl(fullUrl);
      toast.success("Review-link aangemaakt!");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Er ging iets mis."
      );
    } finally {
      setLoading(false);
    }
  };

  const copyLink = () => {
    if (reviewUrl) {
      navigator.clipboard.writeText(reviewUrl);
      toast.success("Link gekopieerd!");
    }
  };

  const reset = () => {
    setReviewerName("");
    setReviewerEmail("");
    setUsePin(false);
    setPin("");
    setExpiresInDays(30);
    setReviewUrl(null);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Deel voor review</DialogTitle>
          <DialogDescription>
            Maak een review-link aan om het document te delen met een reviewer.
          </DialogDescription>
        </DialogHeader>

        {reviewUrl ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Input value={reviewUrl} readOnly className="text-sm" />
              <Button size="sm" variant="outline" onClick={copyLink}>
                <Copy className="size-4" />
              </Button>
            </div>
            {usePin && pin && (
              <p className="text-sm text-muted-foreground">
                Pincode: <strong>{pin}</strong>
              </p>
            )}
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={copyLink}
              >
                <Link2 className="size-4 mr-1.5" />
                Link kopiëren
              </Button>
              {reviewerEmail && (
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    window.location.href = `mailto:${reviewerEmail}?subject=Review document&body=Bekijk het document: ${reviewUrl}`;
                  }}
                >
                  <Mail className="size-4 mr-1.5" />
                  E-mail sturen
                </Button>
              )}
            </div>
            <Button
              variant="ghost"
              className="w-full"
              onClick={reset}
            >
              Nieuwe link aanmaken
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <Label htmlFor="reviewerName">Naam ontvanger (optioneel)</Label>
              <Input
                id="reviewerName"
                value={reviewerName}
                onChange={(e) => setReviewerName(e.target.value)}
                placeholder="Naam"
              />
            </div>

            <div>
              <Label htmlFor="reviewerEmail">
                E-mailadres (voor notificatie bij feedback)
              </Label>
              <Input
                id="reviewerEmail"
                type="email"
                value={reviewerEmail}
                onChange={(e) => setReviewerEmail(e.target.value)}
                placeholder="email@voorbeeld.nl"
              />
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="usePin"
                checked={usePin}
                onCheckedChange={(checked) => setUsePin(checked === true)}
              />
              <Label htmlFor="usePin" className="text-sm">
                Beveilig met pincode
              </Label>
            </div>

            {usePin && (
              <div>
                <Label htmlFor="pin">Pincode</Label>
                <Input
                  id="pin"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="Kies een pincode"
                />
              </div>
            )}

            <div>
              <Label htmlFor="expires">Vervalt na (dagen)</Label>
              <Input
                id="expires"
                type="number"
                min={1}
                max={365}
                value={expiresInDays}
                onChange={(e) => setExpiresInDays(Number(e.target.value))}
              />
            </div>

            <Button
              className="w-full"
              onClick={handleCreate}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="size-4 mr-1.5 animate-spin" />
              ) : (
                <Link2 className="size-4 mr-1.5" />
              )}
              Review-link aanmaken
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

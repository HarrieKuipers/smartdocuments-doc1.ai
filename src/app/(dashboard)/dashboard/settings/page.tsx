"use client";

import { useState, useRef, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, Building2, CreditCard, Camera, Loader2, Trash2, BookOpen, ChevronRight, Bell } from "lucide-react";
import Link from "next/link";

export default function SettingsPage() {
  const { data: session, update } = useSession();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [weeklyDigest, setWeeklyDigest] = useState(true);

  useEffect(() => {
    fetch("/api/user/preferences")
      .then((r) => r.json())
      .then((d) => setWeeklyDigest(d.weeklyDigestEnabled ?? true))
      .catch(() => {});
  }, []);

  async function handleDigestToggle(enabled: boolean) {
    setWeeklyDigest(enabled);
    try {
      await fetch("/api/user/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weeklyDigestEnabled: enabled }),
      });
    } catch {
      setWeeklyDigest(!enabled);
    }
  }

  const currentImage = avatarUrl ?? session?.user?.image;

  const initials = session?.user?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/user/avatar", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Upload mislukt.");
        return;
      }

      setAvatarUrl(data.image);
      await update();
    } catch {
      setError("Upload mislukt. Probeer het opnieuw.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleAvatarDelete() {
    setError(null);
    setUploading(true);

    try {
      const res = await fetch("/api/user/avatar", { method: "DELETE" });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Verwijderen mislukt.");
        return;
      }

      setAvatarUrl(null);
      await update();
    } catch {
      setError("Verwijderen mislukt. Probeer het opnieuw.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Instellingen</h1>
        <p className="text-muted-foreground">
          Beheer je account en organisatie
        </p>
      </div>

      {/* Profile */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <User className="h-5 w-5" />
            Profiel
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Avatar upload */}
          <div className="space-y-2">
            <Label>Profielfoto</Label>
            <div className="flex items-center gap-4">
              <div className="relative group">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={currentImage || undefined} />
                  <AvatarFallback className="bg-[#0062EB] text-white text-xl">
                    {initials || "U"}
                  </AvatarFallback>
                </Avatar>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity group-hover:opacity-100"
                >
                  {uploading ? (
                    <Loader2 className="h-5 w-5 animate-spin text-white" />
                  ) : (
                    <Camera className="h-5 w-5 text-white" />
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
              </div>
              <div className="space-y-1">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                        Uploaden...
                      </>
                    ) : (
                      "Foto uploaden"
                    )}
                  </Button>
                  {currentImage && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleAvatarDelete}
                      disabled={uploading}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  JPG, PNG of WebP. Max 5MB.
                </p>
              </div>
            </div>
            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Naam</Label>
            <Input defaultValue={session?.user?.name || ""} disabled />
          </div>
          <div className="space-y-2">
            <Label>E-mailadres</Label>
            <Input defaultValue={session?.user?.email || ""} disabled />
          </div>
          <div className="space-y-2">
            <Label>Rol</Label>
            <Badge variant="secondary" className="capitalize">
              {session?.user?.role || "owner"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Schrijfwijzers */}
      <Link href="/dashboard/settings/schrijfwijzers">
        <Card className="transition-colors hover:bg-muted/50 cursor-pointer">
          <CardContent className="flex items-center justify-between py-5">
            <div className="flex items-center gap-3">
              <BookOpen className="h-5 w-5 text-[#0062EB]" />
              <div>
                <p className="font-medium">Schrijfwijzers</p>
                <p className="text-sm text-muted-foreground">
                  Beheer de schrijfwijzers voor het herschrijven van documenten.
                </p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </CardContent>
        </Card>
      </Link>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Bell className="h-5 w-5" />
            Notificaties
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Wekelijkse Digest</p>
              <p className="text-sm text-muted-foreground">
                Ontvang elke maandag een samenvatting van je analytics per e-mail.
              </p>
            </div>
            <Switch
              checked={weeklyDigest}
              onCheckedChange={handleDigestToggle}
            />
          </div>
        </CardContent>
      </Card>

      {/* Organization */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Building2 className="h-5 w-5" />
            Organisatie
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Organisatie-instellingen komen binnenkort beschikbaar.
          </p>
        </CardContent>
      </Card>

      {/* Billing */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <CreditCard className="h-5 w-5" />
            Abonnement
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium capitalize">
                {session?.user?.plan || "free"} Plan
              </p>
              <p className="text-sm text-muted-foreground">
                {session?.user?.plan === "pro"
                  ? "€49/maand"
                  : session?.user?.plan === "enterprise"
                  ? "Aangepast"
                  : "Gratis"}
              </p>
            </div>
            <Button variant="outline">
              Upgrade
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lock, Loader2 } from "lucide-react";
import { getLangStrings, type DocumentLanguage } from "@/lib/ai/language";

interface PasswordGateProps {
  onUnlock: (password: string) => void;
  lang?: DocumentLanguage;
}

export default function PasswordGate({ onUnlock, lang = "nl" }: PasswordGateProps) {
  const t = getLangStrings(lang).reader;
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!password) return;
    setLoading(true);
    setError("");
    onUnlock(password);
    // Parent will handle validation; if it fails, it should reset
    setTimeout(() => {
      setLoading(false);
      setError(t.passwordInvalid);
    }, 2000);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
            <Lock className="h-6 w-6 text-gray-500" />
          </div>
          <CardTitle>{t.passwordTitle}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {t.passwordDescription}
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="password"
              placeholder={t.passwordPlaceholder}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button
              type="submit"
              className="w-full bg-[#0062EB] hover:bg-[#0050C0]"
              disabled={loading}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t.passwordOpen}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

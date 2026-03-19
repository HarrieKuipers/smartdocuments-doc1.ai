"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, MessageSquare, ArrowLeft } from "lucide-react";

interface CommunityStrings {
  loginRequired: string;
  loginButton: string;
  registerButton: string;
  registerName: string;
  registerEmail: string;
  registerPassword: string;
  registerSubmit: string;
  registerTitle: string;
  registerSubtitle: string;
  loginTitle: string;
  loginSubtitle: string;
  loginEmail: string;
  loginPassword: string;
  loginSubmit: string;
  orRegister: string;
  orLogin: string;
}

interface CommunityAuthGateProps {
  strings: CommunityStrings;
  brandPrimary: string;
  onAuthenticated: () => void;
}

export default function CommunityAuthGate({
  strings,
  brandPrimary,
  onAuthenticated,
}: CommunityAuthGateProps) {
  const [mode, setMode] = useState<"prompt" | "login" | "register">("prompt");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/community-register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Registratie mislukt.");
        return;
      }

      // Auto-login after registration
      const signInResult = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (signInResult?.ok) {
        onAuthenticated();
      } else {
        setError("Account aangemaakt, maar inloggen mislukt. Probeer in te loggen.");
        setMode("login");
      }
    } catch {
      setError("Er is een fout opgetreden.");
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.ok) {
        onAuthenticated();
      } else {
        setError("Ongeldige inloggegevens.");
      }
    } catch {
      setError("Er is een fout opgetreden.");
    } finally {
      setLoading(false);
    }
  }

  if (mode === "prompt") {
    return (
      <div className="flex flex-col items-center py-8 px-4 text-center">
        <div
          className="mb-4 flex h-12 w-12 items-center justify-center rounded-full"
          style={{ backgroundColor: `${brandPrimary}15` }}
        >
          <MessageSquare className="h-6 w-6" style={{ color: brandPrimary }} />
        </div>
        <p className="mb-4 text-sm text-gray-600">{strings.loginRequired}</p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setMode("login")}
          >
            {strings.loginButton}
          </Button>
          <Button
            size="sm"
            style={{ backgroundColor: brandPrimary }}
            onClick={() => setMode("register")}
          >
            {strings.registerButton}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6">
      <button
        type="button"
        onClick={() => { setMode("prompt"); setError(""); }}
        className="mb-4 flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600"
      >
        <ArrowLeft className="h-3 w-3" />
        Terug
      </button>

      <h3 className="mb-1 text-base font-semibold text-gray-900">
        {mode === "register" ? strings.registerTitle : strings.loginTitle}
      </h3>
      <p className="mb-4 text-sm text-gray-500">
        {mode === "register" ? strings.registerSubtitle : strings.loginSubtitle}
      </p>

      {error && (
        <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </div>
      )}

      <form onSubmit={mode === "register" ? handleRegister : handleLogin} className="space-y-3">
        {mode === "register" && (
          <Input
            placeholder={strings.registerName}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            minLength={2}
            className="text-sm"
          />
        )}
        <Input
          type="email"
          placeholder={mode === "register" ? strings.registerEmail : strings.loginEmail}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="text-sm"
        />
        <Input
          type="password"
          placeholder={mode === "register" ? strings.registerPassword : strings.loginPassword}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={mode === "register" ? 8 : 1}
          className="text-sm"
        />
        <Button
          type="submit"
          className="w-full"
          style={{ backgroundColor: brandPrimary }}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : mode === "register" ? (
            strings.registerSubmit
          ) : (
            strings.loginSubmit
          )}
        </Button>
      </form>

      <p className="mt-3 text-center text-xs text-gray-400">
        {mode === "register" ? strings.orLogin : strings.orRegister}{" "}
        <button
          type="button"
          onClick={() => { setMode(mode === "register" ? "login" : "register"); setError(""); }}
          className="font-medium hover:underline"
          style={{ color: brandPrimary }}
        >
          {mode === "register" ? strings.loginButton : strings.registerButton}
        </button>
      </p>
    </div>
  );
}

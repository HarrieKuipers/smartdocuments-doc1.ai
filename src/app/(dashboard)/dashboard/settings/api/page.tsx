"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Key, Plus, Copy, Loader2, Trash2, AlertTriangle } from "lucide-react";

interface ApiKeyData {
  _id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  isActive: boolean;
  lastUsedAt: string | null;
  createdAt: string;
}

const AVAILABLE_SCOPES = [
  { value: "read:documents", label: "Documenten lezen" },
  { value: "write:documents", label: "Documenten schrijven" },
  { value: "read:collections", label: "Collecties lezen" },
  { value: "write:collections", label: "Collecties schrijven" },
  { value: "read:analytics", label: "Analytics lezen" },
];

export default function ApiKeysPage() {
  const { data: session } = useSession();
  const [keys, setKeys] = useState<ApiKeyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyScopes, setNewKeyScopes] = useState<string[]>([
    "read:documents",
  ]);
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const isEnterprise = session?.user?.plan === "enterprise";

  useEffect(() => {
    if (isEnterprise) fetchKeys();
    else setLoading(false);
  }, [isEnterprise]);

  async function fetchKeys() {
    try {
      const res = await fetch("/api/settings/api-keys");
      const data = await res.json();
      if (res.ok) setKeys(data.data);
    } finally {
      setLoading(false);
    }
  }

  async function createKey() {
    if (!newKeyName.trim() || newKeyScopes.length === 0) return;
    setCreating(true);
    try {
      const res = await fetch("/api/settings/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newKeyName, scopes: newKeyScopes }),
      });
      const data = await res.json();
      if (res.ok) {
        setCreatedKey(data.data.key);
        fetchKeys();
      }
    } finally {
      setCreating(false);
    }
  }

  async function toggleKey(id: string, isActive: boolean) {
    await fetch(`/api/settings/api-keys/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive }),
    });
    setKeys((prev) =>
      prev.map((k) => (k._id === id ? { ...k, isActive } : k))
    );
  }

  async function deleteKey(id: string) {
    if (!confirm("Weet je zeker dat je deze API sleutel wilt verwijderen?"))
      return;
    await fetch(`/api/settings/api-keys/${id}`, { method: "DELETE" });
    setKeys((prev) => prev.filter((k) => k._id !== id));
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function toggleScope(scope: string) {
    setNewKeyScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]
    );
  }

  if (!isEnterprise) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12">
            <AlertTriangle className="h-12 w-12 text-yellow-500" />
            <h2 className="text-xl font-semibold">Enterprise Functie</h2>
            <p className="text-gray-500 text-center max-w-md">
              API toegang is alleen beschikbaar voor Enterprise klanten. Upgrade
              je abonnement om programmatische toegang tot doc1.ai te krijgen.
            </p>
            <Button asChild>
              <a href="/dashboard/settings">Abonnement beheren</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">API Sleutels</h1>
          <p className="text-gray-500">
            Beheer je API sleutels voor programmatische toegang tot doc1.ai
          </p>
        </div>
        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) {
              setCreatedKey(null);
              setNewKeyName("");
              setNewKeyScopes(["read:documents"]);
            }
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nieuwe sleutel
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {createdKey ? "API Sleutel Aangemaakt" : "Nieuwe API Sleutel"}
              </DialogTitle>
            </DialogHeader>

            {createdKey ? (
              <div className="space-y-4">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
                  <AlertTriangle className="h-4 w-4 inline mr-1" />
                  Deze sleutel wordt maar 1x getoond. Kopieer hem nu!
                </div>
                <div className="flex gap-2">
                  <Input value={createdKey} readOnly className="font-mono text-sm" />
                  <Button
                    variant="outline"
                    onClick={() => copyToClipboard(createdKey)}
                  >
                    <Copy className="h-4 w-4" />
                    {copied ? "Gekopieerd!" : "Kopieer"}
                  </Button>
                </div>
                <Button
                  className="w-full"
                  onClick={() => setDialogOpen(false)}
                >
                  Sluiten
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <Label>Naam</Label>
                  <Input
                    placeholder="bijv. Productie, Staging..."
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Rechten</Label>
                  <div className="grid gap-2 mt-2">
                    {AVAILABLE_SCOPES.map((scope) => (
                      <label
                        key={scope.value}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={newKeyScopes.includes(scope.value)}
                          onChange={() => toggleScope(scope.value)}
                          className="rounded"
                        />
                        <span className="text-sm">{scope.label}</span>
                        <Badge variant="secondary" className="text-xs ml-auto">
                          {scope.value}
                        </Badge>
                      </label>
                    ))}
                  </div>
                </div>
                <Button
                  className="w-full"
                  onClick={createKey}
                  disabled={
                    creating || !newKeyName.trim() || newKeyScopes.length === 0
                  }
                >
                  {creating ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Key className="h-4 w-4 mr-2" />
                  )}
                  Sleutel aanmaken
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {/* Quick reference */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-gray-500">
            Snelstart
          </CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="bg-gray-50 rounded-lg p-3 text-sm overflow-x-auto">
            {`curl -H "Authorization: Bearer dk_live_..." \\
  https://app.doc1.ai/api/v1/documents`}
          </pre>
        </CardContent>
      </Card>

      {/* Keys list */}
      <Card>
        <CardHeader>
          <CardTitle>Actieve sleutels</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : keys.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              Nog geen API sleutels aangemaakt.
            </p>
          ) : (
            <div className="space-y-3">
              {keys.map((key) => (
                <div
                  key={key._id}
                  className="flex items-center gap-4 p-3 border rounded-lg"
                >
                  <Key className="h-5 w-5 text-gray-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{key.name}</span>
                      <code className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                        {key.keyPrefix}...
                      </code>
                    </div>
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {key.scopes.map((scope) => (
                        <Badge
                          key={scope}
                          variant="secondary"
                          className="text-xs"
                        >
                          {scope}
                        </Badge>
                      ))}
                    </div>
                    {key.lastUsedAt && (
                      <p className="text-xs text-gray-400 mt-1">
                        Laatst gebruikt:{" "}
                        {new Date(key.lastUsedAt).toLocaleDateString("nl-NL")}
                      </p>
                    )}
                  </div>
                  <Switch
                    checked={key.isActive}
                    onCheckedChange={(checked) => toggleKey(key._id, checked)}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteKey(key._id)}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

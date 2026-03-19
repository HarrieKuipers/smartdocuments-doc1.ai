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
import {
  Plus,
  Loader2,
  Trash2,
  AlertTriangle,
  Webhook,
  Send,
  CheckCircle,
  XCircle,
} from "lucide-react";

interface WebhookData {
  _id: string;
  url: string;
  events: string[];
  isActive: boolean;
  description: string;
  createdAt: string;
}

interface DeliveryData {
  _id: string;
  event: string;
  status: "pending" | "success" | "failed";
  httpStatus: number | null;
  attempts: number;
  createdAt: string;
}

const EVENT_OPTIONS = [
  { value: "document.processed", label: "Document verwerkt" },
  { value: "document.published", label: "Document gepubliceerd" },
  { value: "document.error", label: "Verwerkingsfout" },
  { value: "chat.message", label: "Chat vraag" },
  { value: "analytics.milestone", label: "Analytics milestone" },
];

export default function WebhooksPage() {
  const { data: session } = useSession();
  const [webhooks, setWebhooks] = useState<WebhookData[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newUrl, setNewUrl] = useState("");
  const [newEvents, setNewEvents] = useState<string[]>([]);
  const [newDescription, setNewDescription] = useState("");
  const [selectedWebhook, setSelectedWebhook] = useState<string | null>(null);
  const [deliveries, setDeliveries] = useState<DeliveryData[]>([]);
  const [testing, setTesting] = useState<string | null>(null);

  const isEnterprise = session?.user?.plan === "enterprise";

  useEffect(() => {
    if (isEnterprise) fetchWebhooks();
    else setLoading(false);
  }, [isEnterprise]);

  async function fetchWebhooks() {
    try {
      const res = await fetch("/api/settings/webhooks");
      const data = await res.json();
      if (res.ok) setWebhooks(data.data);
    } finally {
      setLoading(false);
    }
  }

  async function createWebhook() {
    if (!newUrl.trim() || newEvents.length === 0) return;
    setCreating(true);
    try {
      const res = await fetch("/api/settings/webhooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: newUrl,
          events: newEvents,
          description: newDescription,
        }),
      });
      if (res.ok) {
        setDialogOpen(false);
        setNewUrl("");
        setNewEvents([]);
        setNewDescription("");
        fetchWebhooks();
      }
    } finally {
      setCreating(false);
    }
  }

  async function toggleWebhook(id: string, isActive: boolean) {
    await fetch(`/api/settings/webhooks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive }),
    });
    setWebhooks((prev) =>
      prev.map((w) => (w._id === id ? { ...w, isActive } : w))
    );
  }

  async function deleteWebhook(id: string) {
    if (!confirm("Weet je zeker dat je deze webhook wilt verwijderen?")) return;
    await fetch(`/api/settings/webhooks/${id}`, { method: "DELETE" });
    setWebhooks((prev) => prev.filter((w) => w._id !== id));
    if (selectedWebhook === id) setSelectedWebhook(null);
  }

  async function testWebhook(id: string) {
    setTesting(id);
    try {
      const res = await fetch(`/api/settings/webhooks/${id}/test`, {
        method: "POST",
      });
      const data = await res.json();
      alert(
        data.data?.success
          ? "Test geslaagd!"
          : `Test mislukt: ${data.data?.error || "Onbekende fout"}`
      );
    } finally {
      setTesting(null);
    }
  }

  async function loadDeliveries(id: string) {
    setSelectedWebhook(id);
    const res = await fetch(`/api/settings/webhooks/${id}/deliveries`);
    const data = await res.json();
    if (res.ok) setDeliveries(data.data);
  }

  function toggleEvent(event: string) {
    setNewEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event]
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
              Webhooks zijn alleen beschikbaar voor Enterprise klanten. Upgrade
              je abonnement om real-time meldingen te ontvangen.
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
          <h1 className="text-2xl font-bold">Webhooks</h1>
          <p className="text-gray-500">
            Ontvang meldingen wanneer er iets gebeurt in je documenten
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Webhook toevoegen
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nieuwe Webhook</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>URL (HTTPS)</Label>
                <Input
                  placeholder="https://example.com/webhook"
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                />
              </div>
              <div>
                <Label>Beschrijving (optioneel)</Label>
                <Input
                  placeholder="bijv. Productie notificaties"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                />
              </div>
              <div>
                <Label>Events</Label>
                <div className="grid gap-2 mt-2">
                  {EVENT_OPTIONS.map((opt) => (
                    <label
                      key={opt.value}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={newEvents.includes(opt.value)}
                        onChange={() => toggleEvent(opt.value)}
                        className="rounded"
                      />
                      <span className="text-sm">{opt.label}</span>
                      <Badge
                        variant="secondary"
                        className="text-xs ml-auto"
                      >
                        {opt.value}
                      </Badge>
                    </label>
                  ))}
                </div>
              </div>
              <Button
                className="w-full"
                onClick={createWebhook}
                disabled={
                  creating ||
                  !newUrl.startsWith("https://") ||
                  newEvents.length === 0
                }
              >
                {creating ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Webhook className="h-4 w-4 mr-2" />
                )}
                Webhook aanmaken
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      ) : webhooks.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12 text-gray-500">
            Nog geen webhooks geconfigureerd.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {webhooks.map((wh) => (
            <Card key={wh._id}>
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <Webhook className="h-5 w-5 text-gray-400 mt-1 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <code className="text-sm font-medium truncate max-w-xs">
                        {wh.url}
                      </code>
                      {wh.description && (
                        <span className="text-sm text-gray-500">
                          — {wh.description}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {wh.events.map((event) => (
                        <Badge key={event} variant="secondary" className="text-xs">
                          {event}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => testWebhook(wh._id)}
                      disabled={testing === wh._id}
                    >
                      {testing === wh._id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Send className="h-3 w-3" />
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => loadDeliveries(wh._id)}
                    >
                      Log
                    </Button>
                    <Switch
                      checked={wh.isActive}
                      onCheckedChange={(checked) =>
                        toggleWebhook(wh._id, checked)
                      }
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteWebhook(wh._id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Delivery log */}
      {selectedWebhook && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Recente Deliveries</CardTitle>
          </CardHeader>
          <CardContent>
            {deliveries.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-4">
                Geen deliveries gevonden.
              </p>
            ) : (
              <div className="space-y-2">
                {deliveries.map((d) => (
                  <div
                    key={d._id}
                    className="flex items-center gap-3 text-sm p-2 border rounded"
                  >
                    {d.status === "success" ? (
                      <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500 shrink-0" />
                    )}
                    <Badge variant="secondary" className="text-xs">
                      {d.event}
                    </Badge>
                    <span className="text-gray-500">
                      HTTP {d.httpStatus || "—"}
                    </span>
                    <span className="text-gray-400 ml-auto text-xs">
                      {new Date(d.createdAt).toLocaleString("nl-NL")}
                    </span>
                    {d.attempts > 1 && (
                      <Badge variant="outline" className="text-xs">
                        {d.attempts} pogingen
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

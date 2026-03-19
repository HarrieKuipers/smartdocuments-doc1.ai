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
  Loader2,
  AlertTriangle,
  CheckCircle,
  XCircle,
  MessageSquare,
  FileText,
} from "lucide-react";

interface IntegrationData {
  _id: string;
  type: string;
  isActive: boolean;
  config: Record<string, string | undefined>;
  events: string[];
}

const EVENT_OPTIONS = [
  { value: "document.processed", label: "Document verwerkt" },
  { value: "document.error", label: "Verwerkingsfout" },
  { value: "chat.message", label: "Chat vraag" },
  { value: "analytics.milestone", label: "Analytics milestone" },
];

const INTEGRATION_INFO: Record<
  string,
  { name: string; description: string; icon: React.ReactNode }
> = {
  slack: {
    name: "Slack",
    description: "Ontvang meldingen in je Slack kanaal",
    icon: <MessageSquare className="h-6 w-6" />,
  },
  teams: {
    name: "Microsoft Teams",
    description: "Ontvang meldingen in je Teams kanaal",
    icon: <MessageSquare className="h-6 w-6" />,
  },
  notion: {
    name: "Notion",
    description: "Exporteer documentsamenvatting naar Notion pagina's",
    icon: <FileText className="h-6 w-6" />,
  },
};

export default function IntegratiesPage() {
  const { data: session } = useSession();
  const [integrations, setIntegrations] = useState<
    Record<string, IntegrationData | null>
  >({
    slack: null,
    teams: null,
    notion: null,
  });
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{
    type: string;
    success: boolean;
    message: string;
  } | null>(null);

  // Form state
  const [formConfig, setFormConfig] = useState<Record<string, string>>({});
  const [formEvents, setFormEvents] = useState<string[]>([]);

  const isEnterprise = session?.user?.plan === "enterprise";

  useEffect(() => {
    if (isEnterprise) fetchIntegrations();
    else setLoading(false);
  }, [isEnterprise]);

  async function fetchIntegrations() {
    try {
      const res = await fetch("/api/settings/integrations");
      const data = await res.json();
      if (res.ok) {
        const map: Record<string, IntegrationData | null> = {
          slack: null,
          teams: null,
          notion: null,
        };
        for (const i of data.data) {
          map[i.type] = i;
        }
        setIntegrations(map);
      }
    } finally {
      setLoading(false);
    }
  }

  function startEditing(type: string) {
    const existing = integrations[type];
    setEditing(type);
    setFormConfig(existing?.config ? { ...existing.config } as Record<string, string> : {});
    setFormEvents(existing?.events || []);
    setTestResult(null);
  }

  async function saveIntegration() {
    if (!editing) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/settings/integrations/${editing}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          config: formConfig,
          events: formEvents,
          isActive: true,
        }),
      });
      if (res.ok) {
        setEditing(null);
        fetchIntegrations();
      }
    } finally {
      setSaving(false);
    }
  }

  async function deleteIntegration(type: string) {
    if (!confirm("Weet je zeker dat je deze integratie wilt verwijderen?"))
      return;
    await fetch(`/api/settings/integrations/${type}`, { method: "DELETE" });
    setIntegrations((prev) => ({ ...prev, [type]: null }));
  }

  async function testIntegration(type: string) {
    setTesting(type);
    setTestResult(null);
    try {
      const res = await fetch(`/api/settings/integrations/${type}/test`, {
        method: "POST",
      });
      const data = await res.json();
      setTestResult({
        type,
        success: data.data?.success || false,
        message: data.data?.success
          ? "Verbinding geslaagd!"
          : data.data?.error || "Test mislukt",
      });
    } finally {
      setTesting(null);
    }
  }

  function toggleEvent(event: string) {
    setFormEvents((prev) =>
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
              Integraties zijn alleen beschikbaar voor Enterprise klanten.
              Upgrade je abonnement om doc1.ai te verbinden met je tools.
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
      <div>
        <h1 className="text-2xl font-bold">Integraties</h1>
        <p className="text-gray-500">
          Verbind doc1.ai met je favoriete tools
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      ) : (
        <div className="grid gap-4">
          {Object.entries(INTEGRATION_INFO).map(([type, info]) => {
            const integration = integrations[type];
            const isConnected = !!integration;

            return (
              <Card key={type}>
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="p-2 bg-gray-100 rounded-lg">{info.icon}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{info.name}</h3>
                        <Badge
                          variant={isConnected ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {isConnected ? "Verbonden" : "Niet verbonden"}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        {info.description}
                      </p>

                      {isConnected && !editing && (
                        <div className="flex gap-1 mt-2 flex-wrap">
                          {integration.events.map((e) => (
                            <Badge
                              key={e}
                              variant="secondary"
                              className="text-xs"
                            >
                              {e}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 shrink-0">
                      {isConnected && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => testIntegration(type)}
                          disabled={testing === type}
                        >
                          {testing === type ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            "Test"
                          )}
                        </Button>
                      )}
                      <Button
                        variant={editing === type ? "secondary" : "outline"}
                        size="sm"
                        onClick={() =>
                          editing === type
                            ? setEditing(null)
                            : startEditing(type)
                        }
                      >
                        {editing === type ? "Annuleren" : "Configureren"}
                      </Button>
                      {isConnected && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteIntegration(type)}
                          className="text-red-500"
                        >
                          Verwijder
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Test result */}
                  {testResult?.type === type && (
                    <div
                      className={`mt-3 p-2 rounded text-sm flex items-center gap-2 ${
                        testResult.success
                          ? "bg-green-50 text-green-700"
                          : "bg-red-50 text-red-700"
                      }`}
                    >
                      {testResult.success ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : (
                        <XCircle className="h-4 w-4" />
                      )}
                      {testResult.message}
                    </div>
                  )}

                  {/* Edit form */}
                  {editing === type && (
                    <div className="mt-4 pt-4 border-t space-y-4">
                      {type === "slack" && (
                        <>
                          <div>
                            <Label>Slack Webhook URL</Label>
                            <Input
                              placeholder="https://hooks.slack.com/services/..."
                              value={formConfig.slackWebhookUrl || ""}
                              onChange={(e) =>
                                setFormConfig((c) => ({
                                  ...c,
                                  slackWebhookUrl: e.target.value,
                                }))
                              }
                            />
                          </div>
                          <div>
                            <Label>Kanaal (optioneel)</Label>
                            <Input
                              placeholder="#doc1-meldingen"
                              value={formConfig.slackChannel || ""}
                              onChange={(e) =>
                                setFormConfig((c) => ({
                                  ...c,
                                  slackChannel: e.target.value,
                                }))
                              }
                            />
                          </div>
                        </>
                      )}

                      {type === "teams" && (
                        <div>
                          <Label>Teams Webhook URL</Label>
                          <Input
                            placeholder="https://outlook.office.com/webhook/..."
                            value={formConfig.teamsWebhookUrl || ""}
                            onChange={(e) =>
                              setFormConfig((c) => ({
                                ...c,
                                teamsWebhookUrl: e.target.value,
                              }))
                            }
                          />
                        </div>
                      )}

                      {type === "notion" && (
                        <>
                          <div>
                            <Label>Notion API Key</Label>
                            <Input
                              type="password"
                              placeholder="secret_..."
                              value={formConfig.notionApiKey || ""}
                              onChange={(e) =>
                                setFormConfig((c) => ({
                                  ...c,
                                  notionApiKey: e.target.value,
                                }))
                              }
                            />
                          </div>
                          <div>
                            <Label>Parent Page ID</Label>
                            <Input
                              placeholder="Notion pagina ID"
                              value={formConfig.notionParentPageId || ""}
                              onChange={(e) =>
                                setFormConfig((c) => ({
                                  ...c,
                                  notionParentPageId: e.target.value,
                                }))
                              }
                            />
                          </div>
                        </>
                      )}

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
                                checked={formEvents.includes(opt.value)}
                                onChange={() => toggleEvent(opt.value)}
                                className="rounded"
                              />
                              <span className="text-sm">{opt.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      <Button
                        onClick={saveIntegration}
                        disabled={saving}
                        className="w-full"
                      >
                        {saving ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : null}
                        Opslaan
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Key,
  Webhook,
  Plug,
  Loader2,
  Trash2,
  Building2,
  RefreshCw,
} from "lucide-react";

interface ApiKeyData {
  _id: string;
  organizationId: string;
  organizationName?: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  isActive: boolean;
  lastUsedAt: string | null;
  createdAt: string;
}

interface WebhookData {
  _id: string;
  organizationId: string;
  organizationName?: string;
  url: string;
  events: string[];
  isActive: boolean;
  description: string;
  createdAt: string;
}

interface IntegrationData {
  _id: string;
  organizationId: string;
  organizationName?: string;
  type: string;
  isActive: boolean;
  events: string[];
  createdAt: string;
}

export default function ApiManagementPage() {
  const [apiKeys, setApiKeys] = useState<ApiKeyData[]>([]);
  const [webhooks, setWebhooks] = useState<WebhookData[]>([]);
  const [integrations, setIntegrations] = useState<IntegrationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"keys" | "webhooks" | "integrations">("keys");

  useEffect(() => {
    fetchAll();
  }, []);

  async function fetchAll() {
    setLoading(true);
    try {
      const [keysRes, webhooksRes, integrationsRes] = await Promise.all([
        fetch("/api/admin/api-keys"),
        fetch("/api/admin/webhooks"),
        fetch("/api/admin/integrations"),
      ]);

      if (keysRes.ok) {
        const data = await keysRes.json();
        setApiKeys(data.data || []);
      }
      if (webhooksRes.ok) {
        const data = await webhooksRes.json();
        setWebhooks(data.data || []);
      }
      if (integrationsRes.ok) {
        const data = await integrationsRes.json();
        setIntegrations(data.data || []);
      }
    } finally {
      setLoading(false);
    }
  }

  async function deleteApiKey(id: string) {
    if (!confirm("Weet je zeker dat je deze API key wilt verwijderen?")) return;
    const res = await fetch(`/api/admin/api-keys/${id}`, { method: "DELETE" });
    if (res.ok) setApiKeys((prev) => prev.filter((k) => k._id !== id));
  }

  async function deleteWebhook(id: string) {
    if (!confirm("Weet je zeker dat je deze webhook wilt verwijderen?")) return;
    const res = await fetch(`/api/admin/webhooks/${id}`, { method: "DELETE" });
    if (res.ok) setWebhooks((prev) => prev.filter((w) => w._id !== id));
  }

  async function toggleApiKey(id: string, isActive: boolean) {
    const res = await fetch(`/api/admin/api-keys/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive }),
    });
    if (res.ok) {
      setApiKeys((prev) =>
        prev.map((k) => (k._id === id ? { ...k, isActive } : k))
      );
    }
  }

  const tabs = [
    { id: "keys" as const, label: "API Keys", icon: Key, count: apiKeys.length },
    { id: "webhooks" as const, label: "Webhooks", icon: Webhook, count: webhooks.length },
    { id: "integrations" as const, label: "Integraties", icon: Plug, count: integrations.length },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">API Management</h1>
          <p className="text-gray-500">
            Beheer alle API keys, webhooks en integraties van alle organisaties
          </p>
        </div>
        <Button variant="outline" onClick={fetchAll} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Ververs
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              API Keys
            </CardTitle>
            <Key className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{apiKeys.length}</p>
            <p className="text-xs text-gray-500">
              {apiKeys.filter((k) => k.isActive).length} actief
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Webhooks
            </CardTitle>
            <Webhook className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{webhooks.length}</p>
            <p className="text-xs text-gray-500">
              {webhooks.filter((w) => w.isActive).length} actief
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Integraties
            </CardTitle>
            <Plug className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{integrations.length}</p>
            <p className="text-xs text-gray-500">
              {integrations.filter((i) => i.isActive).length} actief
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? "border-[#0062EB] text-[#0062EB]"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
            <Badge variant="secondary" className="text-xs ml-1">
              {tab.count}
            </Badge>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : (
        <>
          {/* API Keys tab */}
          {activeTab === "keys" && (
            <div className="space-y-3">
              {apiKeys.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-gray-500">
                    Nog geen API keys aangemaakt door organisaties.
                  </CardContent>
                </Card>
              ) : (
                apiKeys.map((key) => (
                  <Card key={key._id}>
                    <CardContent className="flex items-center gap-4 p-4">
                      <Key className="h-5 w-5 text-gray-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">{key.name}</span>
                          <code className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                            {key.keyPrefix}...
                          </code>
                          <Badge variant={key.isActive ? "default" : "secondary"} className="text-xs">
                            {key.isActive ? "Actief" : "Inactief"}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                          <Building2 className="h-3 w-3" />
                          {key.organizationName || key.organizationId}
                          {key.lastUsedAt && (
                            <span>
                              · Laatst gebruikt: {new Date(key.lastUsedAt).toLocaleDateString("nl-NL")}
                            </span>
                          )}
                        </div>
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {key.scopes.map((scope) => (
                            <Badge key={scope} variant="outline" className="text-xs">
                              {scope}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleApiKey(key._id, !key.isActive)}
                      >
                        {key.isActive ? "Deactiveer" : "Activeer"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteApiKey(key._id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}

          {/* Webhooks tab */}
          {activeTab === "webhooks" && (
            <div className="space-y-3">
              {webhooks.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-gray-500">
                    Nog geen webhooks geconfigureerd door organisaties.
                  </CardContent>
                </Card>
              ) : (
                webhooks.map((wh) => (
                  <Card key={wh._id}>
                    <CardContent className="flex items-center gap-4 p-4">
                      <Webhook className="h-5 w-5 text-gray-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <code className="text-sm truncate max-w-xs">{wh.url}</code>
                          <Badge variant={wh.isActive ? "default" : "secondary"} className="text-xs">
                            {wh.isActive ? "Actief" : "Inactief"}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                          <Building2 className="h-3 w-3" />
                          {wh.organizationName || wh.organizationId}
                          {wh.description && <span>· {wh.description}</span>}
                        </div>
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {wh.events.map((event) => (
                            <Badge key={event} variant="outline" className="text-xs">
                              {event}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteWebhook(wh._id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}

          {/* Integrations tab */}
          {activeTab === "integrations" && (
            <div className="space-y-3">
              {integrations.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-gray-500">
                    Nog geen integraties geconfigureerd door organisaties.
                  </CardContent>
                </Card>
              ) : (
                integrations.map((intg) => (
                  <Card key={intg._id}>
                    <CardContent className="flex items-center gap-4 p-4">
                      <Plug className="h-5 w-5 text-gray-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium capitalize">{intg.type}</span>
                          <Badge variant={intg.isActive ? "default" : "secondary"} className="text-xs">
                            {intg.isActive ? "Actief" : "Inactief"}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                          <Building2 className="h-3 w-3" />
                          {intg.organizationName || intg.organizationId}
                        </div>
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {intg.events.map((event) => (
                            <Badge key={event} variant="outline" className="text-xs">
                              {event}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

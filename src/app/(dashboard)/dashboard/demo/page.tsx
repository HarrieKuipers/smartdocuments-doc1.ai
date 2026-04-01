"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Globe, AlertTriangle, ArrowLeft, Settings2, ChevronUp, ChevronDown } from "lucide-react";
import ChatWidget from "@/components/chat/ChatWidget";
import { toast } from "sonner";

interface Collection {
  _id: string;
  name: string;
  slug: string;
}

interface CollectionConfig {
  chatIntro?: string;
  chatPlaceholder?: string;
  chatSuggestions?: string[];
  chatSuggestionsCache?: {
    question: string;
    answer: string;
    sourceDocuments?: { shortId: string; title: string }[];
  }[];
  templateConfig?: {
    primary?: string;
  };
  organization?: {
    brandColors?: { primary?: string };
  };
}

export default function WidgetDemoPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const preselectedSlug = searchParams.get("collection");

  const [collections, setCollections] = useState<Collection[]>([]);
  const [loadingCollections, setLoadingCollections] = useState(true);

  const [selectedSlug, setSelectedSlug] = useState("");
  const [config, setConfig] = useState<CollectionConfig | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(false);

  const [url, setUrl] = useState("https://annualreport.dsm-firmenich.com/2025/");
  const [activeUrl, setActiveUrl] = useState("");
  const [iframeError, setIframeError] = useState(false);
  const [demoActive, setDemoActive] = useState(false);
  const [configBarOpen, setConfigBarOpen] = useState(true);

  // Fetch collections on mount
  useEffect(() => {
    fetch("/api/collections")
      .then((r) => r.json())
      .then(({ data }) => {
        setCollections(data || []);
        if (preselectedSlug) {
          const match = (data || []).find(
            (c: Collection) => c.slug === preselectedSlug
          );
          if (match) {
            setSelectedSlug(match.slug);
          }
        }
      })
      .catch(() => toast.error("Kon collecties niet laden."))
      .finally(() => setLoadingCollections(false));
  }, [preselectedSlug]);

  // Fetch collection config when selection changes
  const fetchConfig = useCallback(async (slug: string) => {
    if (!slug) {
      setConfig(null);
      return;
    }
    setLoadingConfig(true);
    try {
      const res = await fetch(`/api/reader/collections/${slug}`);
      if (res.ok) {
        const { data } = await res.json();
        setConfig(data);
      } else {
        toast.error("Kon collectie-configuratie niet laden.");
        setConfig(null);
      }
    } catch {
      toast.error("Kon collectie-configuratie niet laden.");
      setConfig(null);
    } finally {
      setLoadingConfig(false);
    }
  }, []);

  useEffect(() => {
    if (selectedSlug) {
      fetchConfig(selectedSlug);
    }
  }, [selectedSlug, fetchConfig]);

  function handleStartDemo() {
    if (!selectedSlug) {
      toast.error("Selecteer eerst een collectie.");
      return;
    }
    if (!url.trim()) {
      toast.error("Voer een website-URL in.");
      return;
    }
    let normalizedUrl = url.trim();
    if (!/^https?:\/\//i.test(normalizedUrl)) {
      normalizedUrl = "https://" + normalizedUrl;
      setUrl(normalizedUrl);
    }
    setIframeError(false);
    setActiveUrl(normalizedUrl);
    setDemoActive(true);
    setConfigBarOpen(false);
  }

  const brandColor =
    config?.templateConfig?.primary ||
    config?.organization?.brandColors?.primary ||
    "#0062EB";

  return (
    <>
      {/* Full-screen overlay that covers the entire dashboard shell */}
      <div className="fixed inset-0 z-[100] flex flex-col bg-white">
        {/* Top bar — always visible */}
        <div className="flex items-center justify-between border-b bg-white/95 backdrop-blur px-4 py-2">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/dashboard/collections")}
              className="text-gray-600"
            >
              <ArrowLeft className="mr-1 h-4 w-4" />
              Terug naar dashboard
            </Button>
            {demoActive && activeUrl && (
              <span className="hidden text-xs text-muted-foreground sm:inline">
                {activeUrl}
              </span>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setConfigBarOpen(!configBarOpen)}
          >
            <Settings2 className="mr-1 h-4 w-4" />
            Instellingen
            {configBarOpen ? (
              <ChevronUp className="ml-1 h-3 w-3" />
            ) : (
              <ChevronDown className="ml-1 h-3 w-3" />
            )}
          </Button>
        </div>

        {/* Collapsible config panel */}
        {configBarOpen && (
          <div className="border-b bg-gray-50 px-4 py-3">
            <div className="mx-auto flex max-w-4xl flex-wrap items-end gap-3">
              <div className="w-[260px] space-y-1">
                <Label className="text-xs text-muted-foreground">Collectie</Label>
                {loadingCollections ? (
                  <div className="flex h-9 items-center gap-2 rounded-md border bg-white px-3">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Laden...</span>
                  </div>
                ) : (
                  <Select value={selectedSlug} onValueChange={setSelectedSlug}>
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="Selecteer collectie" />
                    </SelectTrigger>
                    <SelectContent>
                      {collections.map((c) => (
                        <SelectItem key={c._id} value={c.slug}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="min-w-[300px] flex-1 space-y-1">
                <Label className="text-xs text-muted-foreground">Website URL</Label>
                <Input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="bg-white"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleStartDemo();
                  }}
                />
              </div>

              <Button
                onClick={handleStartDemo}
                disabled={!selectedSlug || !url.trim() || loadingConfig}
                className="bg-[#0062EB] hover:bg-[#0050C0]"
              >
                {loadingConfig && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Start Demo
              </Button>
            </div>
          </div>
        )}

        {/* Full-screen viewport */}
        <div className="relative flex-1 overflow-hidden">
          {!demoActive ? (
            <div className="flex h-full flex-col items-center justify-center gap-4 bg-gray-50 text-center">
              <Globe className="h-20 w-20 text-gray-300" />
              <div>
                <p className="text-xl font-medium text-gray-500">
                  Widget Demo
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Selecteer een collectie en voer een website-URL in om te zien<br />
                  hoe de chat-widget eruitziet op de website van je klant
                </p>
              </div>
            </div>
          ) : (
            <>
              {iframeError ? (
                <div className="flex h-full flex-col items-center justify-center gap-4 bg-gradient-to-br from-gray-50 to-gray-200 text-center">
                  <AlertTriangle className="h-12 w-12 text-amber-500" />
                  <div className="max-w-md">
                    <p className="text-lg font-medium text-gray-700">
                      Website blokkeert inladen
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      <span className="font-mono text-xs">{activeUrl}</span> staat
                      niet toe om in een iframe geladen te worden. De chat-widget
                      werkt nog steeds — stel je voor dat deze website op de
                      achtergrond staat.
                    </p>
                  </div>
                </div>
              ) : (
                <iframe
                  src={activeUrl}
                  className="h-full w-full border-0"
                  title="Client website preview"
                  sandbox="allow-scripts allow-same-origin allow-popups"
                  onError={() => setIframeError(true)}
                  onLoad={(e) => {
                    try {
                      const iframe = e.target as HTMLIFrameElement;
                      const doc = iframe.contentDocument;
                      if (doc && !doc.body?.innerHTML) {
                        setIframeError(true);
                      }
                    } catch {
                      // Cross-origin — iframe loaded successfully
                    }
                  }}
                />
              )}

              {/* Chat widget overlay */}
              {config && (
                <ChatWidget
                  documentId=""
                  collectionSlug={selectedSlug}
                  brandPrimary={brandColor}
                  chatMode="full"
                  language="nl"
                  customIntro={config.chatIntro}
                  customPlaceholder={config.chatPlaceholder}
                  customSuggestions={config.chatSuggestions}
                  cachedAnswers={config.chatSuggestionsCache}
                  contextName={collections.find((c) => c.slug === selectedSlug)?.name}
                />
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}

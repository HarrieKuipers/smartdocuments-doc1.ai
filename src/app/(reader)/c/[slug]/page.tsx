"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { nanoid } from "nanoid";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  FileText,
  FolderOpen,
  Search,
  X,
  Lock,
  Loader2,
  GitCompareArrows,
} from "lucide-react";
import DocFooter from "@/components/reader/DocFooter";
import ChatWidget from "@/components/chat/ChatWidget";
import DefaultHeader from "@/components/reader/headers/DefaultHeader";
import RijksoverheidHeader from "@/components/reader/headers/RijksoverheidHeader";
import AmsterdamHeader from "@/components/reader/headers/AmsterdamHeader";
import DocumentCompare from "@/components/collection/DocumentCompare";

interface CollectionDocument {
  _id: string;
  shortId: string;
  slug: string;
  title: string;
  authors: string[];
  description?: string;
  coverImageUrl?: string;
  customCoverUrl?: string;
  publicationDate?: string;
  tags: string[];
  pageCount?: number;
  chatSuggestions?: string[];
  chatSuggestionsCache?: {
    question: string;
    answer: string;
    sourceDocuments?: { shortId: string; title: string }[];
  }[];
  keyPoints?: { text: string; explanation?: string }[];
  pageImages?: {
    pageNumber: number;
    url: string;
    contentType?: "table" | "chart" | "diagram" | "image-with-text";
    description?: string;
  }[];
  createdAt: string;
}

interface TemplateConfig {
  id: string;
  name: string;
  primary: string;
  primaryDark: string;
  primaryLight: string;
  logo?: string;
  headerStyle: "default" | "split-bar" | "inline-logo";
  logoPosition?: "left" | "center" | "right";
}

interface CollectionData {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  coverImage?: string;
  template?: string;
  templateConfig?: TemplateConfig;
  chatIntro?: string;
  chatPlaceholder?: string;
  chatSuggestions?: string[];
  chatSuggestionsCache?: {
    question: string;
    answer: string;
    sourceDocuments?: { shortId: string; title: string }[];
  }[];
  organization: {
    name: string;
    slug: string;
    logo?: string;
    brandColors: { primary: string; secondary: string; accent: string };
  };
  documents: CollectionDocument[];
}

export default function PublicCollectionPage() {
  const params = useParams();
  const [collection, setCollection] = useState<CollectionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Password gate
  const [needsPassword, setNeedsPassword] = useState(false);
  const [passwordMeta, setPasswordMeta] = useState<{
    name: string;
    description?: string;
    organization?: CollectionData["organization"];
  } | null>(null);
  const [password, setPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  // Search and filter
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // Compare mode
  const [compareMode, setCompareMode] = useState(false);

  // Analytics tracking
  const sessionIdRef = useRef("");
  if (typeof window !== "undefined" && !sessionIdRef.current) {
    let sid = sessionStorage.getItem("col_session");
    if (!sid) {
      sid = nanoid();
      sessionStorage.setItem("col_session", sid);
    }
    sessionIdRef.current = sid;
  }

  const trackEvent = useCallback(
    (eventType: string, metadata?: Record<string, unknown>) => {
      if (!params.slug) return;
      const sid = sessionIdRef.current;
      if (!sid) return;
      fetch(`/api/reader/collections/${params.slug}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          events: [{ eventType, sessionId: sid, metadata }],
        }),
      }).catch(() => {});
    },
    [params.slug]
  );

  // Track page view once
  const trackedRef = useRef(false);
  useEffect(() => {
    if (collection && !trackedRef.current) {
      trackedRef.current = true;
      trackEvent("page_view");
    }
  }, [collection, trackEvent]);

  // Track search queries (debounced)
  const searchTimerRef = useRef<NodeJS.Timeout>(undefined);
  useEffect(() => {
    if (!searchQuery.trim()) return;
    clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      trackEvent("search_query", { searchQuery: searchQuery.trim() });
    }, 1000);
    return () => clearTimeout(searchTimerRef.current);
  }, [searchQuery, trackEvent]);

  async function fetchCollection(pw?: string) {
    try {
      const headers: Record<string, string> = {};
      if (pw) headers["x-collection-password"] = pw;

      const res = await fetch(`/api/reader/collections/${params.slug}`, {
        headers,
      });

      if (res.status === 401) {
        const body = await res.json();
        if (body.requiresPassword) {
          setNeedsPassword(true);
          if (body.data) {
            setPasswordMeta(body.data);
          }
          if (pw) {
            setPasswordError("Onjuist wachtwoord. Probeer het opnieuw.");
          }
          setLoading(false);
          setPasswordLoading(false);
          return;
        }
      }

      if (!res.ok) {
        setError("Collectie niet gevonden.");
        return;
      }

      const { data } = await res.json();
      setCollection(data);
      setNeedsPassword(false);
    } catch {
      setError("Kon collectie niet laden.");
    } finally {
      setLoading(false);
      setPasswordLoading(false);
    }
  }

  useEffect(() => {
    fetchCollection();
  }, [params.slug]);

  // Collect all unique tags from documents
  const allTags = useMemo(() => {
    if (!collection) return [];
    const tagSet = new Set<string>();
    collection.documents.forEach((doc) => {
      doc.tags?.forEach((tag) => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }, [collection]);

  // Filter and sort documents
  const filteredDocs = useMemo(() => {
    if (!collection) return [];
    let docs = [...collection.documents];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      docs = docs.filter(
        (doc) =>
          doc.title.toLowerCase().includes(q) ||
          doc.description?.toLowerCase().includes(q) ||
          doc.authors?.some((a) => a.toLowerCase().includes(q))
      );
    }

    if (selectedTag) {
      docs = docs.filter((doc) => doc.tags?.includes(selectedTag));
    }

    // Sort alphabetically
    docs.sort((a, b) => a.title.localeCompare(b.title, "nl"));

    return docs;
  }, [collection, searchQuery, selectedTag]);

  function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!password) return;
    setPasswordLoading(true);
    setPasswordError("");
    fetchCollection(password);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F7FA]">
        <div className="mx-auto max-w-[1200px] px-4 py-12 md:px-6">
          <Skeleton className="mb-2 h-10 w-72" />
          <Skeleton className="mb-8 h-5 w-96" />
          <Skeleton className="mb-6 h-10 w-full max-w-md" />
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-64 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Password gate
  if (needsPassword) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F5F7FA] px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
              <Lock className="h-6 w-6 text-gray-500" />
            </div>
            <CardTitle>{passwordMeta?.name || "Beveiligde Collectie"}</CardTitle>
            <p className="text-sm text-muted-foreground">
              Deze collectie is beschermd met een wachtwoord.
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <Input
                type="password"
                placeholder="Voer wachtwoord in"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              {passwordError && (
                <p className="text-sm text-red-500">{passwordError}</p>
              )}
              <Button
                type="submit"
                className="w-full bg-[#0062EB] hover:bg-[#0050C0]"
                disabled={passwordLoading}
              >
                {passwordLoading && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Openen
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !collection) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F5F7FA]">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <FolderOpen className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <p className="font-medium">{error || "Collectie niet gevonden."}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const tpl = collection.templateConfig;
  const brandPrimary = tpl?.primary || "#0062EB";

  return (
    <div className="min-h-screen bg-[#F5F7FA]">
      {/* Header */}
      {tpl?.headerStyle === "split-bar" && tpl.logo ? (
        <RijksoverheidHeader title={collection.name} brandPrimary={brandPrimary} logo={tpl.logo} />
      ) : tpl?.headerStyle === "inline-logo" && tpl.logo ? (
        <AmsterdamHeader title={collection.name} brandPrimary={brandPrimary} logo={tpl.logo} />
      ) : (
        <DefaultHeader title={collection.name} organization={collection.organization} brandPrimary={brandPrimary} />
      )}

      {/* Collection info */}
      <div className="px-4 py-10 sm:px-6 lg:px-10">
        <div className="mb-8">
          {collection.description && (
            <p className="text-lg text-muted-foreground">
              {collection.description}
            </p>
          )}
        </div>

        {/* Compare mode */}
        {compareMode && collection.documents.length >= 2 && (
          <DocumentCompare
            collectionSlug={collection.slug}
            documents={collection.documents.map((d) => ({
              title: d.title,
              shortId: d.shortId,
            }))}
            brandPrimary={brandPrimary}
            onClose={() => setCompareMode(false)}
          />
        )}

        {/* Search + tag filters */}
        {!compareMode && collection.documents.length > 0 && (
          <div className="mb-6 space-y-4">
            {/* Search bar + compare button */}
            <div className="flex items-center gap-3">
            <div className="relative max-w-md flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Zoek op titel, auteur of beschrijving..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-white pl-10"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-gray-900"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
              {collection.documents.length >= 2 && (
                <Button
                  variant="outline"
                  onClick={() => setCompareMode(true)}
                  className="shrink-0"
                >
                  <GitCompareArrows className="mr-2 h-4 w-4" />
                  Vergelijken
                </Button>
              )}
            </div>

            {/* Tag filters */}
            {allTags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedTag(null)}
                  className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                    !selectedTag
                      ? "bg-gray-900 text-white"
                      : "bg-white text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  Alles
                </button>
                {allTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() =>
                    {
                      const newTag = selectedTag === tag ? null : tag;
                      setSelectedTag(newTag);
                      if (newTag) trackEvent("tag_filter", { tag: newTag });
                    }
                    }
                    className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                      selectedTag === tag
                        ? "text-white"
                        : "bg-white text-gray-600 hover:bg-gray-100"
                    }`}
                    style={
                      selectedTag === tag
                        ? { backgroundColor: brandPrimary }
                        : undefined
                    }
                  >
                    {tag}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Documents grid */}
        {compareMode ? null : filteredDocs.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <FileText className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <p className="text-muted-foreground">
                {searchQuery || selectedTag
                  ? "Geen documenten gevonden met deze zoekcriteria."
                  : "Er zijn nog geen documenten in deze collectie."}
              </p>
              {(searchQuery || selectedTag) && (
                <Button
                  variant="ghost"
                  className="mt-3"
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedTag(null);
                  }}
                >
                  Filters wissen
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
            {filteredDocs.map((doc) => (
              <Link key={doc._id} href={`/${doc.shortId}`} onClick={() => trackEvent("document_click", { documentShortId: doc.shortId, documentTitle: doc.title })}>
                <Card className="group h-full cursor-pointer overflow-hidden rounded-xl border py-0 gap-0 transition-all hover:shadow-lg">
                  {/* Cover image */}
                  {(doc.customCoverUrl || doc.coverImageUrl) ? (
                    <div className="aspect-[3/4] overflow-hidden bg-gray-50">
                      <img
                        src={doc.customCoverUrl || doc.coverImageUrl}
                        alt={doc.title}
                        className="h-full w-full object-cover transition-transform group-hover:scale-[1.02]"
                      />
                    </div>
                  ) : (
                    <div
                      className="flex aspect-[3/4] items-center justify-center"
                      style={{
                        backgroundColor: `${brandPrimary}08`,
                      }}
                    >
                      <FileText
                        className="h-8 w-8 sm:h-12 sm:w-12"
                        style={{ color: `${brandPrimary}40` }}
                      />
                    </div>
                  )}

                  <CardContent className="p-3 sm:p-5">
                    <h3 className="mb-1 text-sm font-semibold text-gray-900 line-clamp-2 sm:mb-2 sm:text-base">
                      {doc.title}
                    </h3>

                    {doc.description && (
                      <p className="mb-2 hidden text-sm text-muted-foreground line-clamp-2 sm:block sm:mb-3">
                        {doc.description}
                      </p>
                    )}


                    {doc.tags?.length > 0 && (
                      <div className="mt-2 hidden flex-wrap gap-1.5 sm:mt-3 sm:flex">
                        {doc.tags.slice(0, 3).map((tag, i) => (
                          <Badge
                            key={i}
                            variant="secondary"
                            className="text-xs font-normal"
                          >
                            {tag}
                          </Badge>
                        ))}
                        {doc.tags.length > 3 && (
                          <Badge
                            variant="secondary"
                            className="text-xs font-normal"
                          >
                            +{doc.tags.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <DocFooter brandPrimary={brandPrimary} />

      {/* Collection Chat Widget */}
      {collection.documents.length > 0 && (
        <ChatWidget
          documentId=""
          brandPrimary={brandPrimary}
          chatMode="full"
          language="nl"
          collectionSlug={collection.slug}
          customIntro={collection.chatIntro}
          customPlaceholder={collection.chatPlaceholder}
          customSuggestions={collection.chatSuggestions}
          cachedAnswers={collection.chatSuggestionsCache}
          contextName={collection.name}
          collectionDocuments={collection.documents.map(d => ({
            title: d.title,
            shortId: d.shortId,
            coverImageUrl: d.coverImageUrl,
            customCoverUrl: d.customCoverUrl,
            pageCount: d.pageCount,
            chatSuggestions: d.chatSuggestions,
            chatSuggestionsCache: d.chatSuggestionsCache,
            keyPoints: d.keyPoints,
            pageImages: d.pageImages,
          }))}
        />
      )}
    </div>
  );
}

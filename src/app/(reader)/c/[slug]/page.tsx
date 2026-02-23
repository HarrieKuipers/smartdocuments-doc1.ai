"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  FileText,
  FolderOpen,
  User,
  Calendar,
  BookOpen,
  Search,
  X,
  Lock,
  Loader2,
} from "lucide-react";
import DocFooter from "@/components/reader/DocFooter";

interface CollectionDocument {
  _id: string;
  shortId: string;
  slug: string;
  title: string;
  authors: string[];
  description?: string;
  coverImageUrl?: string;
  publicationDate?: string;
  tags: string[];
  pageCount?: number;
  createdAt: string;
}

interface CollectionData {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  coverImage?: string;
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

  // Filter documents
  const filteredDocs = useMemo(() => {
    if (!collection) return [];
    let docs = collection.documents;

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

  const brandPrimary =
    collection.organization.brandColors?.primary || "#0062EB";

  return (
    <div className="min-h-screen bg-[#F5F7FA]">
      {/* Collection info */}
      <div className="mx-auto max-w-[1200px] px-4 py-10 md:px-6">
        <div className="mb-8">
          <h1 className="mb-2 text-3xl font-bold text-gray-900">
            {collection.name}
          </h1>
          {collection.description && (
            <p className="text-lg text-muted-foreground">
              {collection.description}
            </p>
          )}
          <p className="mt-2 text-sm text-muted-foreground">
            {collection.documents.length} document
            {collection.documents.length !== 1 ? "en" : ""}
          </p>
        </div>

        {/* Search + tag filters */}
        {collection.documents.length > 0 && (
          <div className="mb-6 space-y-4">
            {/* Search bar */}
            <div className="relative max-w-md">
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
                      setSelectedTag(selectedTag === tag ? null : tag)
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
        {filteredDocs.length === 0 ? (
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
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredDocs.map((doc) => (
              <Link key={doc._id} href={`/d/${doc.shortId}`}>
                <Card className="group h-full cursor-pointer overflow-hidden rounded-xl border transition-all hover:shadow-lg">
                  {/* Cover image */}
                  {doc.coverImageUrl ? (
                    <div className="aspect-[16/10] overflow-hidden bg-gray-100">
                      <img
                        src={doc.coverImageUrl}
                        alt={doc.title}
                        className="h-full w-full object-cover transition-transform group-hover:scale-105"
                      />
                    </div>
                  ) : (
                    <div
                      className="flex aspect-[16/10] items-center justify-center"
                      style={{
                        backgroundColor: `${brandPrimary}10`,
                      }}
                    >
                      <FileText
                        className="h-12 w-12"
                        style={{ color: `${brandPrimary}40` }}
                      />
                    </div>
                  )}

                  <CardContent className="p-5">
                    <h3 className="mb-2 text-base font-semibold text-gray-900 line-clamp-2">
                      {doc.title}
                    </h3>

                    {doc.description && (
                      <p className="mb-3 text-sm text-muted-foreground line-clamp-2">
                        {doc.description}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      {doc.authors?.[0] && (
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {doc.authors[0]}
                        </span>
                      )}
                      {doc.publicationDate && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(doc.publicationDate).toLocaleDateString(
                            "nl-NL"
                          )}
                        </span>
                      )}
                      {doc.pageCount && (
                        <span className="flex items-center gap-1">
                          <BookOpen className="h-3 w-3" />
                          {doc.pageCount} pag.
                        </span>
                      )}
                    </div>

                    {doc.tags?.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
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
    </div>
  );
}

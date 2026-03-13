"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search,
  X,
  FileText,
  User,
  Calendar,
  BookOpen,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import DocFooter from "@/components/reader/DocFooter";

interface SearchDocument {
  _id: string;
  shortId: string;
  slug: string;
  title: string;
  displayTitle?: string;
  authors: string[];
  description?: string;
  coverImageUrl?: string;
  customCoverUrl?: string;
  publicationDate?: string;
  tags: string[];
  pageCount?: number;
  createdAt: string;
}

interface SearchCollection {
  _id: string;
  name: string;
  slug: string;
}

interface SearchOrganization {
  _id: string;
  name: string;
  slug: string;
  logo?: string;
  brandColors: { primary: string; secondary: string; accent: string };
}

interface SearchResult {
  documents: SearchDocument[];
  organization: SearchOrganization;
  tags: string[];
  collections: SearchCollection[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function PublicSearchPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const orgSlug = params.orgSlug as string;

  const [data, setData] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState(searchParams.get("q") || "");
  const [activeQuery, setActiveQuery] = useState(searchParams.get("q") || "");
  const [selectedTag, setSelectedTag] = useState<string | null>(
    searchParams.get("tag") || null
  );
  const [selectedCollection, setSelectedCollection] = useState<string | null>(
    searchParams.get("collectie") || null
  );
  const [page, setPage] = useState(
    parseInt(searchParams.get("pagina") || "1")
  );

  const fetchResults = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ orgSlug, page: String(page) });
      if (activeQuery) params.set("q", activeQuery);
      if (selectedTag) params.set("tag", selectedTag);
      if (selectedCollection) params.set("collectionId", selectedCollection);

      const res = await fetch(`/api/reader/search?${params}`);
      if (!res.ok) throw new Error();
      const { data } = await res.json();
      setData(data);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [orgSlug, activeQuery, selectedTag, selectedCollection, page]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  // Update URL params
  useEffect(() => {
    const params = new URLSearchParams();
    if (activeQuery) params.set("q", activeQuery);
    if (selectedTag) params.set("tag", selectedTag);
    if (selectedCollection) params.set("collectie", selectedCollection);
    if (page > 1) params.set("pagina", String(page));
    const qs = params.toString();
    router.replace(`/zoeken/${orgSlug}${qs ? `?${qs}` : ""}`, {
      scroll: false,
    });
  }, [activeQuery, selectedTag, selectedCollection, page, orgSlug, router]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setActiveQuery(searchInput);
    setPage(1);
  }

  const brandPrimary = data?.organization?.brandColors?.primary || "#0062EB";

  return (
    <div className="min-h-screen bg-[#F5F7FA]">
      <div className="mx-auto max-w-[1200px] px-4 py-10 md:px-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="mb-2 text-3xl font-bold text-gray-900">
            Documenten zoeken
          </h1>
          {data?.organization && (
            <p className="text-muted-foreground">
              Zoek door alle documenten van {data.organization.name}
            </p>
          )}
        </div>

        {/* Search bar */}
        <form onSubmit={handleSearch} className="mb-6">
          <div className="relative max-w-2xl">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Zoek op titel, beschrijving, tag of auteur..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="h-12 bg-white pl-12 pr-20 text-base rounded-xl"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => {
                  setSearchInput("");
                  setActiveQuery("");
                  setPage(1);
                }}
                className="absolute right-14 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-gray-900"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            <Button
              type="submit"
              size="sm"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg"
              style={{ backgroundColor: brandPrimary }}
            >
              Zoek
            </Button>
          </div>
        </form>

        {/* Filters */}
        {data && (
          <div className="mb-6 space-y-3">
            {/* Collection filter */}
            {data.collections.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    setSelectedCollection(null);
                    setPage(1);
                  }}
                  className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                    !selectedCollection
                      ? "bg-gray-900 text-white"
                      : "bg-white text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  Alle collecties
                </button>
                {data.collections.map((col) => (
                  <button
                    key={col._id}
                    onClick={() => {
                      setSelectedCollection(
                        selectedCollection === col._id ? null : col._id
                      );
                      setPage(1);
                    }}
                    className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                      selectedCollection === col._id
                        ? "text-white"
                        : "bg-white text-gray-600 hover:bg-gray-100"
                    }`}
                    style={
                      selectedCollection === col._id
                        ? { backgroundColor: brandPrimary }
                        : undefined
                    }
                  >
                    {col.name}
                  </button>
                ))}
              </div>
            )}

            {/* Tag filter */}
            {data.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    setSelectedTag(null);
                    setPage(1);
                  }}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    !selectedTag
                      ? "bg-gray-700 text-white"
                      : "bg-white text-gray-500 hover:bg-gray-100"
                  }`}
                >
                  Alle tags
                </button>
                {data.tags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => {
                      setSelectedTag(selectedTag === tag ? null : tag);
                      setPage(1);
                    }}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                      selectedTag === tag
                        ? "text-white"
                        : "bg-white text-gray-500 hover:bg-gray-100"
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

        {/* Results count */}
        {data && !loading && (
          <p className="mb-4 text-sm text-muted-foreground">
            {data.total} document{data.total !== 1 ? "en" : ""} gevonden
            {activeQuery && (
              <>
                {" "}
                voor &ldquo;{activeQuery}&rdquo;
              </>
            )}
          </p>
        )}

        {/* Loading */}
        {loading && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-64 rounded-xl" />
            ))}
          </div>
        )}

        {/* Results */}
        {!loading && data && data.documents.length === 0 && (
          <Card>
            <CardContent className="py-16 text-center">
              <FileText className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <p className="text-muted-foreground">
                Geen documenten gevonden.
              </p>
              {(activeQuery || selectedTag || selectedCollection) && (
                <Button
                  variant="ghost"
                  className="mt-3"
                  onClick={() => {
                    setSearchInput("");
                    setActiveQuery("");
                    setSelectedTag(null);
                    setSelectedCollection(null);
                    setPage(1);
                  }}
                >
                  Filters wissen
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {!loading && data && data.documents.length > 0 && (
          <>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {data.documents.map((doc) => (
                <Link key={doc._id} href={`/${doc.shortId}`}>
                  <Card className="group h-full cursor-pointer overflow-hidden rounded-xl border transition-all hover:shadow-lg">
                    {doc.customCoverUrl || doc.coverImageUrl ? (
                      <div className="aspect-[16/10] overflow-hidden bg-gray-100">
                        <img
                          src={doc.customCoverUrl || doc.coverImageUrl}
                          alt={doc.title}
                          className="h-full w-full object-cover transition-transform group-hover:scale-105"
                        />
                      </div>
                    ) : (
                      <div
                        className="flex aspect-[16/10] items-center justify-center"
                        style={{ backgroundColor: `${brandPrimary}10` }}
                      >
                        <FileText
                          className="h-12 w-12"
                          style={{ color: `${brandPrimary}40` }}
                        />
                      </div>
                    )}
                    <CardContent className="p-5">
                      <h3 className="mb-2 text-base font-semibold text-gray-900 line-clamp-2">
                        {doc.displayTitle || doc.title}
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

            {/* Pagination */}
            {data.totalPages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground">
                  Pagina {page} van {data.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= data.totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      <DocFooter brandPrimary={brandPrimary} />
    </div>
  );
}

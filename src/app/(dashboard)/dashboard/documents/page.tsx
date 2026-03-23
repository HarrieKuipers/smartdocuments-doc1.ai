"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Upload, Search, Eye, Pencil, Trash2, MoreHorizontal, FileText, FolderOpen, ArrowUpDown, X, Clock, ChevronDown, ChevronRight } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

interface Document {
  _id: string;
  title: string;
  authors: string[];
  status: string;
  createdAt: string;
  publishedAt?: string;
  analytics: { totalViews: number };
  shortId: string;
  coverImageUrl?: string;
  customCoverUrl?: string;
  collectionId?: string;
  tags?: string[];
  isDraft?: boolean;
  scheduledPublishAt?: string;
}

interface Collection {
  _id: string;
  name: string;
}

interface DocGroup {
  id: string;
  name: string;
  docs: Document[];
  isCollection: boolean;
}

const statusColors: Record<string, string> = {
  ready: "bg-green-100 text-green-700",
  processing: "bg-blue-100 text-blue-700",
  uploading: "bg-yellow-100 text-yellow-700",
  error: "bg-red-100 text-red-700",
};

const statusLabels: Record<string, string> = {
  ready: "Gepubliceerd",
  processing: "Verwerking",
  uploading: "Uploaden",
  error: "Fout",
};

export default function DocumentsPage() {
  const [docs, setDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [collections, setCollections] = useState<Collection[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  async function fetchDocs() {
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (search && sortBy === "newest") {
        params.set("sortBy", "relevance");
      } else {
        params.set("sortBy", sortBy);
      }
      if (selectedTag) params.set("tag", selectedTag);

      const res = await fetch(`/api/documents?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setDocs(data.data || []);
        if (data.tags) setAvailableTags(data.tags);
      }
    } catch {
      toast.error("Kon documenten niet laden.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchDocs();
    fetchCollections();
  }, [statusFilter, sortBy, selectedTag]);

  async function fetchCollections() {
    try {
      const res = await fetch("/api/collections");
      if (res.ok) {
        const { data } = await res.json();
        setCollections(data || []);
      }
    } catch {
      // Non-blocking
    }
  }

  async function handleMoveToCollection(docId: string, collectionId: string | null) {
    try {
      const res = await fetch(`/api/documents/${docId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ collectionId }),
      });
      if (res.ok) {
        toast.success(collectionId ? "Document verplaatst naar collectie." : "Document uit collectie verwijderd.");
        fetchDocs();
      }
    } catch {
      toast.error("Kon document niet verplaatsen.");
    }
  }

  useEffect(() => {
    const timer = setTimeout(fetchDocs, 500);
    return () => clearTimeout(timer);
  }, [search]);

  async function handleDelete(id: string) {
    if (!confirm("Weet je zeker dat je dit document wilt verwijderen?")) return;
    try {
      const res = await fetch(`/api/documents/${id}`, { method: "DELETE" });
      if (res.ok) {
        setDocs(docs.filter((d) => d._id !== id));
        toast.success("Document verwijderd.");
      }
    } catch {
      toast.error("Verwijderen mislukt.");
    }
  }

  function toggleGroup(groupId: string) {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  }

  // Group documents by collection
  function getGroups(): DocGroup[] {
    const collectionMap = new Map<string, Collection>();
    for (const c of collections) {
      collectionMap.set(c._id, c);
    }

    const grouped = new Map<string, Document[]>();
    const ungrouped: Document[] = [];

    for (const doc of docs) {
      if (doc.collectionId && collectionMap.has(doc.collectionId)) {
        const existing = grouped.get(doc.collectionId) || [];
        existing.push(doc);
        grouped.set(doc.collectionId, existing);
      } else {
        ungrouped.push(doc);
      }
    }

    const groups: DocGroup[] = [];

    // Collections first
    for (const [colId, colDocs] of grouped) {
      const col = collectionMap.get(colId)!;
      groups.push({
        id: colId,
        name: col.name,
        docs: colDocs,
        isCollection: true,
      });
    }

    // Sort collections by name
    groups.sort((a, b) => a.name.localeCompare(b.name));

    // Ungrouped last
    if (ungrouped.length > 0) {
      groups.push({
        id: "_ungrouped",
        name: "Losse documenten",
        docs: ungrouped,
        isCollection: false,
      });
    }

    return groups;
  }

  const groups = getGroups();
  const hasCollections = groups.some((g) => g.isCollection);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Documenten</h1>
          <p className="text-muted-foreground">
            Beheer al je documenten
          </p>
        </div>
        <Link href="/dashboard/upload">
          <Button className="bg-[#0062EB] hover:bg-[#0050C0]">
            <Upload className="mr-2 h-4 w-4" />
            Upload Document
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Zoeken in documenten..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-full sm:w-48">
            <div className="flex items-center gap-2">
              <ArrowUpDown className="h-4 w-4" />
              <SelectValue placeholder="Sorteren" />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Nieuwste</SelectItem>
            <SelectItem value="oldest">Oudste</SelectItem>
            <SelectItem value="most-viewed">Meest bekeken</SelectItem>
            <SelectItem value="title">Titel A-Z</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle statussen</SelectItem>
            <SelectItem value="ready">Gepubliceerd</SelectItem>
            <SelectItem value="processing">Verwerking</SelectItem>
            <SelectItem value="uploading">Uploaden</SelectItem>
            <SelectItem value="error">Fout</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tag filter chips */}
      {availableTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {availableTags.map((tag) => (
            <button
              key={tag}
              onClick={() =>
                setSelectedTag(selectedTag === tag ? null : tag)
              }
              className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm transition-colors ${
                selectedTag === tag
                  ? "bg-[#0062EB] text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {tag}
              {selectedTag === tag && <X className="h-3 w-3" />}
            </button>
          ))}
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : docs.length === 0 ? (
        <div className="rounded-lg border bg-white p-12 text-center">
          <p className="text-muted-foreground">Geen documenten gevonden.</p>
        </div>
      ) : (
        <div className="rounded-lg border bg-white overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[200px]">Titel</TableHead>
                <TableHead className="hidden sm:table-cell">Auteur</TableHead>
                <TableHead className="hidden md:table-cell">Geïndexeerd</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden sm:table-cell">Views</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {groups.map((group) => {
                const isCollapsed = collapsedGroups.has(group.id);
                const showGroupHeader = hasCollections;

                return (
                  <CollectionGroup
                    key={group.id}
                    group={group}
                    isCollapsed={isCollapsed}
                    showHeader={showGroupHeader}
                    onToggle={() => toggleGroup(group.id)}
                    collections={collections}
                    onMoveToCollection={handleMoveToCollection}
                    onDelete={handleDelete}
                  />
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

// -- Collection Group --
function CollectionGroup({
  group,
  isCollapsed,
  showHeader,
  onToggle,
  collections,
  onMoveToCollection,
  onDelete,
}: {
  group: DocGroup;
  isCollapsed: boolean;
  showHeader: boolean;
  onToggle: () => void;
  collections: Collection[];
  onMoveToCollection: (docId: string, colId: string | null) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <>
      {showHeader && (
        <TableRow
          className="bg-gray-50/80 hover:bg-gray-100/80 cursor-pointer"
          onClick={onToggle}
        >
          <TableCell colSpan={6}>
            <div className="flex items-center gap-2">
              {isCollapsed ? (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
              {group.isCollection && (
                <FolderOpen className="h-4 w-4 text-muted-foreground" />
              )}
              <span className="text-sm font-medium">{group.name}</span>
              <Badge variant="secondary" className="text-[10px] font-normal">
                {group.docs.length}
              </Badge>
            </div>
          </TableCell>
        </TableRow>
      )}
      {!isCollapsed &&
        group.docs.map((doc) => (
          <DocumentRow
            key={doc._id}
            doc={doc}
            collections={collections}
            onMoveToCollection={onMoveToCollection}
            onDelete={onDelete}
          />
        ))}
    </>
  );
}

// -- Document Row --
function DocumentRow({
  doc,
  collections,
  onMoveToCollection,
  onDelete,
}: {
  doc: Document;
  collections: Collection[];
  onMoveToCollection: (docId: string, colId: string | null) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <TableRow>
      <TableCell className="font-medium max-w-[300px]">
        <div className="flex items-center gap-3">
          {(doc.customCoverUrl || doc.coverImageUrl) ? (
            <img
              src={doc.customCoverUrl || doc.coverImageUrl}
              alt=""
              className="hidden sm:block h-8 w-12 flex-shrink-0 rounded object-cover"
            />
          ) : (
            <div className="hidden sm:flex h-8 w-12 flex-shrink-0 items-center justify-center rounded bg-gray-100">
              <FileText className="h-4 w-4 text-muted-foreground" />
            </div>
          )}
          <div className="min-w-0">
            <div className="truncate">
              {doc.status === "ready" ? (
                <Link
                  href={`/${doc.shortId}`}
                  className="hover:underline"
                  style={{ color: "#0062EB" }}
                >
                  {doc.title}
                </Link>
              ) : (
                doc.title
              )}
            </div>
            <div className="sm:hidden text-xs text-muted-foreground mt-1">
              {doc.authors?.[0] || "—"}
            </div>
          </div>
        </div>
      </TableCell>
      <TableCell className="text-muted-foreground hidden sm:table-cell">
        {doc.authors?.[0] || "—"}
      </TableCell>
      <TableCell className="text-muted-foreground hidden md:table-cell whitespace-nowrap">
        {doc.publishedAt
          ? new Date(doc.publishedAt).toLocaleDateString("nl-NL")
          : new Date(doc.createdAt).toLocaleDateString("nl-NL")}
      </TableCell>
      <TableCell>
        <div className="flex flex-col gap-1">
          <Badge className={statusColors[doc.status] || ""}>
            {statusLabels[doc.status] || doc.status}
          </Badge>
          {doc.isDraft && doc.status === "ready" && !doc.scheduledPublishAt && (
            <Badge className="bg-gray-100 text-gray-600">Concept</Badge>
          )}
          {doc.isDraft && doc.scheduledPublishAt && (
            <Badge className="bg-purple-100 text-purple-700 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Gepland: {new Date(doc.scheduledPublishAt).toLocaleDateString("nl-NL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
            </Badge>
          )}
        </div>
      </TableCell>
      <TableCell className="hidden sm:table-cell">{doc.analytics?.totalViews || 0}</TableCell>
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={`/dashboard/documents/${doc._id}/edit`}>
                <Pencil className="mr-2 h-4 w-4" />
                Bewerken
              </Link>
            </DropdownMenuItem>
            {doc.status === "ready" && (
              <DropdownMenuItem asChild>
                <Link href={`/${doc.shortId}`} target="_blank">
                  <Eye className="mr-2 h-4 w-4" />
                  Bekijken
                </Link>
              </DropdownMenuItem>
            )}
            {collections.length > 0 && (
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <FolderOpen className="mr-2 h-4 w-4" />
                  Collectie
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  {collections.map((col) => (
                    <DropdownMenuItem
                      key={col._id}
                      onClick={() => onMoveToCollection(doc._id, col._id)}
                    >
                      {col.name}
                      {doc.collectionId === col._id && " ✓"}
                    </DropdownMenuItem>
                  ))}
                  {doc.collectionId && (
                    <DropdownMenuItem
                      onClick={() => onMoveToCollection(doc._id, null)}
                      className="text-muted-foreground"
                    >
                      Uit collectie verwijderen
                    </DropdownMenuItem>
                  )}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            )}
            <DropdownMenuItem
              onClick={() => onDelete(doc._id)}
              className="text-red-600"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Verwijderen
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}

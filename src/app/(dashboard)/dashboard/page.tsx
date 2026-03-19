"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FileText,
  Eye,
  Upload,
  Plus,
  ArrowRight,
  MessageSquare,
} from "lucide-react";

interface RecentDocument {
  _id: string;
  title: string;
  displayTitle?: string;
  status: string;
  createdAt: string;
  analytics: { totalViews: number; chatInteractions: number };
  coverImageUrl?: string;
  customCoverUrl?: string;
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const [recentDocs, setRecentDocs] = useState<RecentDocument[]>([]);
  const [totalDocs, setTotalDocs] = useState(0);
  const [totalViews, setTotalViews] = useState(0);
  const [totalChats, setTotalChats] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/documents?limit=8");
        if (res.ok) {
          const data = await res.json();
          const docs: RecentDocument[] = data.data || [];
          setRecentDocs(docs);
          setTotalDocs(data.total || 0);
          setTotalViews(
            docs.reduce((sum, d) => sum + (d.analytics?.totalViews || 0), 0)
          );
          setTotalChats(
            docs.reduce((sum, d) => sum + (d.analytics?.chatInteractions || 0), 0)
          );
        }
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

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

  const firstName = session?.user?.name?.split(" ")[0] || "gebruiker";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold md:text-2xl">
            Welkom terug, {firstName}
          </h1>
          <p className="text-sm text-gray-500">
            {totalDocs} {totalDocs === 1 ? "document" : "documenten"}
          </p>
        </div>
        <Link href="/dashboard/upload">
          <Button className="bg-[#0062EB] hover:bg-[#0050C0]">
            <Plus className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Nieuw document</span>
            <span className="sm:hidden">Nieuw</span>
          </Button>
        </Link>
      </div>

      {/* Analytics summary — one compact row */}
      {!loading && recentDocs.length > 0 && (
        <div className="flex items-center gap-6 rounded-lg bg-white px-4 py-3 text-sm">
          <div className="flex items-center gap-1.5 text-gray-600">
            <FileText className="h-3.5 w-3.5 text-gray-400" />
            <span className="font-semibold text-gray-900">{totalDocs}</span>
            documenten
          </div>
          <div className="flex items-center gap-1.5 text-gray-600">
            <Eye className="h-3.5 w-3.5 text-gray-400" />
            <span className="font-semibold text-gray-900">{totalViews}</span>
            views
          </div>
          <div className="flex items-center gap-1.5 text-gray-600">
            <MessageSquare className="h-3.5 w-3.5 text-gray-400" />
            <span className="font-semibold text-gray-900">{totalChats}</span>
            chats
          </div>
        </div>
      )}

      {/* Document list */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 rounded-lg border bg-white p-3">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <div className="flex-1">
                <Skeleton className="mb-1 h-4 w-48" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          ))}
        </div>
      ) : recentDocs.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-white py-16">
          <Upload className="mb-3 h-10 w-10 text-gray-300" />
          <p className="mb-1 font-medium text-gray-700">
            Nog geen documenten
          </p>
          <p className="mb-4 text-sm text-gray-500">
            Upload je eerste PDF of DOCX
          </p>
          <Link href="/dashboard/upload">
            <Button className="bg-[#0062EB] hover:bg-[#0050C0]">
              <Upload className="mr-2 h-4 w-4" />
              Upload document
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-1">
          {recentDocs.map((doc) => (
            <Link
              key={doc._id}
              href={`/dashboard/documents/${doc._id}/edit`}
              className="flex items-center gap-3 rounded-lg border border-transparent bg-white p-3 transition-colors hover:border-gray-200 hover:bg-gray-50"
            >
              {/* Thumbnail */}
              {(doc.customCoverUrl || doc.coverImageUrl) ? (
                <img
                  src={doc.customCoverUrl || doc.coverImageUrl}
                  alt=""
                  className="h-10 w-10 shrink-0 rounded-lg object-cover bg-gray-100"
                />
              ) : (
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100">
                  <FileText className="h-4 w-4 text-gray-400" />
                </div>
              )}

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {doc.displayTitle || doc.title}
                </p>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span>
                    {new Date(doc.createdAt).toLocaleDateString("nl-NL")}
                  </span>
                  {doc.analytics?.totalViews > 0 && (
                    <span className="flex items-center gap-0.5">
                      <Eye className="h-3 w-3" />
                      {doc.analytics.totalViews}
                    </span>
                  )}
                </div>
              </div>

              {/* Status */}
              <Badge
                className={`shrink-0 text-xs ${statusColors[doc.status] || "bg-gray-100 text-gray-700"}`}
              >
                {statusLabels[doc.status] || doc.status}
              </Badge>
            </Link>
          ))}

          {/* View all link */}
          {totalDocs > 8 && (
            <Link
              href="/dashboard/documents"
              className="flex items-center justify-center gap-1 rounded-lg py-2 text-sm font-medium text-[#0062EB] hover:bg-[#0062EB]/5 transition-colors"
            >
              Alle documenten bekijken
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

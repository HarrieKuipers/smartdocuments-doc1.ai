"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  MessageSquare,
  Eye,
  TrendingUp,
  Upload,
  FolderOpen,
  BarChart3,
} from "lucide-react";

interface DashboardStats {
  totalDocuments: number;
  totalChatInteractions: number;
  totalViews: number;
  growthThisMonth: number;
}

interface RecentDocument {
  _id: string;
  title: string;
  status: string;
  createdAt: string;
  analytics: { totalViews: number };
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentDocs, setRecentDocs] = useState<RecentDocument[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/documents?limit=6");
        if (res.ok) {
          const data = await res.json();
          setRecentDocs(data.data || []);
          setStats({
            totalDocuments: data.total || 0,
            totalChatInteractions: 0,
            totalViews: (data.data || []).reduce(
              (acc: number, d: RecentDocument) =>
                acc + (d.analytics?.totalViews || 0),
              0
            ),
            growthThisMonth: 0,
          });
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

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold">
          Welkom terug, {session?.user?.name?.split(" ")[0] || "gebruiker"}!
        </h1>
        <p className="text-muted-foreground">
          Hier is een overzicht van je documenten en activiteiten
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Totaal documenten
                </CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {stats?.totalDocuments || 0}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  AI interacties
                </CardTitle>
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {stats?.totalChatInteractions || 0}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Totaal views
                </CardTitle>
                <Eye className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {stats?.totalViews || 0}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Groei deze maand
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  +{stats?.growthThisMonth || 0}%
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-3">
        <Link href="/dashboard/upload">
          <Card className="cursor-pointer transition-shadow hover:shadow-md">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#00BCD4]/10">
                <Upload className="h-5 w-5 text-[#00BCD4]" />
              </div>
              <div>
                <p className="font-medium">Upload Document</p>
                <p className="text-sm text-muted-foreground">
                  PDF of DOCX uploaden
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/dashboard/collections">
          <Card className="cursor-pointer transition-shadow hover:shadow-md">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#00BCD4]/10">
                <FolderOpen className="h-5 w-5 text-[#00BCD4]" />
              </div>
              <div>
                <p className="font-medium">Bekijk Collecties</p>
                <p className="text-sm text-muted-foreground">
                  Organiseer documenten
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/dashboard/analytics">
          <Card className="cursor-pointer transition-shadow hover:shadow-md">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#00BCD4]/10">
                <BarChart3 className="h-5 w-5 text-[#00BCD4]" />
              </div>
              <div>
                <p className="font-medium">Analytics</p>
                <p className="text-sm text-muted-foreground">
                  Bekijk statistieken
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Recent Documents */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recente Documenten</h2>
          <Link href="/dashboard/documents">
            <Button variant="ghost" size="sm">
              Bekijk alles
            </Button>
          </Link>
        </div>
        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="mb-2 h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : recentDocs.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="mb-4 h-12 w-12 text-muted-foreground" />
              <p className="mb-2 font-medium">Nog geen documenten</p>
              <p className="mb-4 text-sm text-muted-foreground">
                Upload je eerste document om te beginnen
              </p>
              <Link href="/dashboard/upload">
                <Button className="bg-[#00BCD4] hover:bg-[#00838F]">
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Document
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {recentDocs.map((doc) => (
              <Link
                key={doc._id}
                href={`/dashboard/documents/${doc._id}/edit`}
              >
                <Card className="cursor-pointer transition-shadow hover:shadow-md">
                  <CardContent className="p-6">
                    <div className="mb-2 flex items-start justify-between">
                      <h3 className="font-medium line-clamp-1">
                        {doc.title}
                      </h3>
                      <Badge
                        className={
                          statusColors[doc.status] || "bg-gray-100 text-gray-700"
                        }
                      >
                        {statusLabels[doc.status] || doc.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        {doc.analytics?.totalViews || 0} views
                      </span>
                      <span>
                        {new Date(doc.createdAt).toLocaleDateString("nl-NL")}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText, Eye } from "lucide-react";

interface Collection {
  _id: string;
  name: string;
  description?: string;
}

interface Document {
  _id: string;
  title: string;
  shortId: string;
  status: string;
  authors: string[];
  createdAt: string;
}

export default function CollectionDetailPage() {
  const params = useParams();
  const [collection, setCollection] = useState<Collection | null>(null);
  const [docs, setDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch_data() {
      try {
        const [colRes, docsRes] = await Promise.all([
          fetch(`/api/collections/${params.id}`),
          fetch(`/api/documents?collectionId=${params.id}`),
        ]);
        if (colRes.ok) {
          const col = await colRes.json();
          setCollection(col.data);
        }
        if (docsRes.ok) {
          const d = await docsRes.json();
          setDocs(d.data || []);
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    }
    fetch_data();
  }, [params.id]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/collections">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Terug
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">{collection?.name || "Collectie"}</h1>
          {collection?.description && (
            <p className="text-muted-foreground">{collection.description}</p>
          )}
        </div>
      </div>

      {docs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">
              Geen documenten in deze collectie.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {docs.map((doc) => (
            <Link key={doc._id} href={`/dashboard/documents/${doc._id}/edit`}>
              <Card className="cursor-pointer transition-shadow hover:shadow-md">
                <CardContent className="p-6">
                  <h3 className="mb-2 font-medium line-clamp-2">{doc.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {doc.authors?.[0] || "Onbekend"}
                  </p>
                  <div className="mt-3 flex items-center justify-between">
                    <Badge
                      className={
                        doc.status === "ready"
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-700"
                      }
                    >
                      {doc.status === "ready" ? "Gepubliceerd" : doc.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
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
  );
}

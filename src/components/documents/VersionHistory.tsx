"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Clock,
  GitBranch,
  Plus,
  Loader2,
  ChevronDown,
  ChevronUp,
  User,
} from "lucide-react";

interface Version {
  _id: string;
  versionNumber: number;
  versionLabel?: string;
  createdBy?: { name?: string; email?: string };
  createdAt: string;
  pageCount?: number;
}

interface VersionHistoryProps {
  documentId: string;
  onCreateVersion?: () => void;
}

export default function VersionHistory({
  documentId,
  onCreateVersion,
}: VersionHistoryProps) {
  const [versions, setVersions] = useState<Version[]>([]);
  const [currentVersion, setCurrentVersion] = useState(1);
  const [totalVersions, setTotalVersions] = useState(1);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const fetchVersions = useCallback(async () => {
    try {
      const res = await fetch(`/api/documents/${documentId}/versions`);
      if (!res.ok) return;
      const { data } = await res.json();
      setVersions(data.versions || []);
      setCurrentVersion(data.currentVersion || 1);
      setTotalVersions(data.totalVersions || 1);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [documentId]);

  useEffect(() => {
    fetchVersions();
  }, [fetchVersions]);

  async function handleCreateVersion() {
    setCreating(true);
    try {
      const res = await fetch(`/api/documents/${documentId}/versions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        await fetchVersions();
        onCreateVersion?.();
      }
    } catch {
      // ignore
    } finally {
      setCreating(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Versies laden...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GitBranch className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-semibold">Versiegeschiedenis</h3>
          <Badge variant="secondary" className="text-xs">
            v{currentVersion}
          </Badge>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={handleCreateVersion}
          disabled={creating}
        >
          {creating ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Plus className="mr-2 h-4 w-4" />
          )}
          Versie opslaan
        </Button>
      </div>

      {versions.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nog geen eerdere versies. Klik op &quot;Versie opslaan&quot; om de
          huidige staat op te slaan voordat je wijzigingen maakt.
        </p>
      ) : (
        <>
          <div className={`space-y-2 ${!expanded && versions.length > 3 ? "max-h-48 overflow-hidden" : ""}`}>
            {versions.map((v) => (
              <Card key={v._id} className="border">
                <CardContent className="flex items-center justify-between p-3">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="text-xs">
                      v{v.versionNumber}
                    </Badge>
                    <div>
                      <p className="text-sm font-medium">
                        {v.versionLabel || `Versie ${v.versionNumber}`}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(v.createdAt).toLocaleDateString("nl-NL", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        {v.createdBy?.name && (
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {v.createdBy.name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          {versions.length > 3 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
              className="w-full"
            >
              {expanded ? (
                <>
                  <ChevronUp className="mr-2 h-4 w-4" />
                  Minder tonen
                </>
              ) : (
                <>
                  <ChevronDown className="mr-2 h-4 w-4" />
                  Alle {versions.length} versies tonen
                </>
              )}
            </Button>
          )}
        </>
      )}
    </div>
  );
}

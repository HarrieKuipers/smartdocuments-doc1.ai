"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, ChevronLeft, ChevronRight, Users, FileText } from "lucide-react";

interface OrgRow {
  _id: string;
  name: string;
  slug: string;
  brandColors: { primary: string; secondary: string; accent: string };
  members: number;
  documents: number;
  owner: { name: string; email: string; plan: string } | null;
  createdAt: string;
}

export default function AdminOrganizationsPage() {
  const [orgs, setOrgs] = useState<OrgRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchOrgs = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    params.set("page", page.toString());

    const res = await fetch(`/api/admin/organizations?${params}`);
    const data = await res.json();
    setOrgs(data.data || []);
    setTotalPages(data.totalPages || 1);
    setTotal(data.total || 0);
    setLoading(false);
  }, [search, page]);

  useEffect(() => {
    fetchOrgs();
  }, [fetchOrgs]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Organizations</h1>
        <p className="text-sm text-gray-500">{total} organizations on the platform</p>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search by name or slug..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="pl-9"
        />
      </div>

      {/* Table */}
      <Card className="rounded-2xl border-gray-100 overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                  <th className="px-6 py-3">Organization</th>
                  <th className="px-6 py-3">Owner</th>
                  <th className="px-6 py-3">Brand</th>
                  <th className="px-6 py-3">Members</th>
                  <th className="px-6 py-3">Documents</th>
                  <th className="px-6 py-3">Created</th>
                </tr>
              </thead>
              <tbody>
                {orgs.map((o) => (
                  <tr key={o._id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-gray-900">{o.name}</p>
                      <p className="text-xs text-gray-500">{o.slug}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-700">{o.owner?.name || "—"}</p>
                      <p className="text-xs text-gray-500">{o.owner?.email || ""}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-1.5">
                        <span
                          className="h-6 w-6 rounded-full border border-gray-200"
                          style={{ backgroundColor: o.brandColors?.primary || "#0062EB" }}
                        />
                        <span
                          className="h-6 w-6 rounded-full border border-gray-200"
                          style={{ backgroundColor: o.brandColors?.secondary || "#0050C0" }}
                        />
                        <span
                          className="h-6 w-6 rounded-full border border-gray-200"
                          style={{ backgroundColor: o.brandColors?.accent || "#E0F7FA" }}
                        />
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1 text-sm text-gray-600">
                        <Users className="h-3.5 w-3.5" /> {o.members}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1 text-sm text-gray-600">
                        <FileText className="h-3.5 w-3.5" /> {o.documents}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(o.createdAt).toLocaleDateString("nl-NL")}
                    </td>
                  </tr>
                ))}
                {orgs.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-sm text-gray-400">
                      No organizations found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

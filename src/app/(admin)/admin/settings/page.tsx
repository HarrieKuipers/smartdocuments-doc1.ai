"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Shield, Server, Database } from "lucide-react";

interface SuperAdmin {
  _id: string;
  name: string;
  email: string;
}

export default function AdminSettingsPage() {
  const [admins, setAdmins] = useState<SuperAdmin[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/users?limit=100")
      .then((r) => r.json())
      .then((data) => {
        const superAdmins = (data.data || []).filter(
          (u: { isSuperAdmin: boolean }) => u.isSuperAdmin
        );
        setAdmins(superAdmins);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Platform Settings</h1>
        <p className="text-sm text-gray-500">Internal platform configuration</p>
      </div>

      {/* Superadmins */}
      <Card className="rounded-2xl border-gray-100">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Shield className="h-4 w-4 text-red-500" />
            Super Admins
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : admins.length > 0 ? (
            <div className="space-y-3">
              {admins.map((a) => (
                <div
                  key={a._id}
                  className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">{a.name}</p>
                    <p className="text-xs text-gray-500">{a.email}</p>
                  </div>
                  <Badge className="bg-red-100 text-red-700">Super Admin</Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">No super admins found.</p>
          )}
          <p className="mt-4 text-xs text-gray-400">
            To grant super admin access, set isSuperAdmin: true on the user document in MongoDB.
          </p>
        </CardContent>
      </Card>

      {/* Platform Info */}
      <Card className="rounded-2xl border-gray-100">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Server className="h-4 w-4 text-gray-500" />
            Platform Info
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3">
              <span className="text-sm text-gray-600">Framework</span>
              <span className="text-sm font-medium text-gray-900">Next.js 16+ (App Router)</span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3">
              <span className="text-sm text-gray-600">Database</span>
              <span className="text-sm font-medium text-gray-900">MongoDB (Mongoose)</span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3">
              <span className="text-sm text-gray-600">Auth</span>
              <span className="text-sm font-medium text-gray-900">NextAuth v5</span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3">
              <span className="text-sm text-gray-600">Storage</span>
              <span className="text-sm font-medium text-gray-900">DigitalOcean Spaces</span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3">
              <span className="text-sm text-gray-600">Payments</span>
              <span className="text-sm font-medium text-gray-900">Stripe</span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3">
              <span className="text-sm text-gray-600">AI</span>
              <span className="text-sm font-medium text-gray-900">Anthropic Claude</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

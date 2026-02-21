"use client";

import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { User, Building2, CreditCard } from "lucide-react";

export default function SettingsPage() {
  const { data: session } = useSession();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Instellingen</h1>
        <p className="text-muted-foreground">
          Beheer je account en organisatie
        </p>
      </div>

      {/* Profile */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <User className="h-5 w-5" />
            Profiel
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Naam</Label>
            <Input defaultValue={session?.user?.name || ""} disabled />
          </div>
          <div className="space-y-2">
            <Label>E-mailadres</Label>
            <Input defaultValue={session?.user?.email || ""} disabled />
          </div>
          <div className="space-y-2">
            <Label>Rol</Label>
            <Badge variant="secondary" className="capitalize">
              {session?.user?.role || "owner"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Organization */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Building2 className="h-5 w-5" />
            Organisatie
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Organisatie-instellingen komen binnenkort beschikbaar.
          </p>
        </CardContent>
      </Card>

      {/* Billing */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <CreditCard className="h-5 w-5" />
            Abonnement
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium capitalize">
                {session?.user?.plan || "free"} Plan
              </p>
              <p className="text-sm text-muted-foreground">
                {session?.user?.plan === "pro"
                  ? "€49/maand"
                  : session?.user?.plan === "enterprise"
                  ? "Aangepast"
                  : "Gratis"}
              </p>
            </div>
            <Button variant="outline">
              Upgrade
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

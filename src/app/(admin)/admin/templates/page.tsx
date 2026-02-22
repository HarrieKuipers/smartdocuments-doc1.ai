"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Palette, BookOpen, Info, Layout } from "lucide-react";

const templates = [
  {
    id: "doc1",
    name: "Doc1",
    primary: "#0062EB",
    primaryDark: "#0050C0",
    primaryLight: "#E0F0FF",
    headerStyle: "default",
    showB1Button: false,
    showInfoBox: false,
  },
  {
    id: "rijksoverheid",
    name: "Rijksoverheid",
    primary: "#154273",
    primaryDark: "#0c2840",
    primaryLight: "#d6e4f0",
    logo: "/templates/logo_rijksoverheid.png",
    headerStyle: "split-bar",
    showB1Button: true,
    showInfoBox: true,
  },
  {
    id: "amsterdam",
    name: "Amsterdam",
    primary: "#EC0000",
    primaryDark: "#c40000",
    primaryLight: "#ffe6e6",
    logo: "/templates/logo_amsterdam.svg",
    headerStyle: "inline-logo",
    showB1Button: false,
    showInfoBox: true,
  },
];

export default function AdminTemplatesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Templates</h1>
        <p className="text-sm text-gray-500">
          {templates.length} templates available
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {templates.map((t) => (
          <Card key={t.id} className="rounded-2xl border-gray-100 overflow-hidden">
            {/* Preview header */}
            <div
              className="h-24 flex items-end p-4"
              style={{ backgroundColor: t.primary }}
            >
              <div className="flex items-center gap-3">
                {t.logo && (
                  <img
                    src={t.logo}
                    alt={t.name}
                    className="h-8 rounded bg-white/20 p-1"
                  />
                )}
                <span className="text-lg font-bold text-white">{t.name}</span>
              </div>
            </div>

            <CardContent className="p-5 space-y-4">
              {/* Colors */}
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400 mb-2">
                  Colors
                </p>
                <div className="flex gap-2">
                  {[
                    { label: "Primary", color: t.primary },
                    { label: "Dark", color: t.primaryDark },
                    { label: "Light", color: t.primaryLight },
                  ].map((c) => (
                    <div key={c.label} className="flex items-center gap-2">
                      <span
                        className="h-6 w-6 rounded-lg border border-gray-200"
                        style={{ backgroundColor: c.color }}
                      />
                      <span className="text-xs text-gray-500">{c.color}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Features */}
              <div className="flex flex-wrap gap-2">
                <Badge className="bg-gray-100 text-gray-600">
                  <Layout className="mr-1 h-3 w-3" />
                  {t.headerStyle}
                </Badge>
                {t.showB1Button && (
                  <Badge className="bg-emerald-100 text-emerald-700">
                    <BookOpen className="mr-1 h-3 w-3" />
                    B1 Button
                  </Badge>
                )}
                {t.showInfoBox && (
                  <Badge className="bg-blue-100 text-blue-700">
                    <Info className="mr-1 h-3 w-3" />
                    Info Box
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

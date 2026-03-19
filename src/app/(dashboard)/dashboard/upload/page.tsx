"use client";

import UploadZone from "@/components/documents/UploadZone";
import BulkUploadZone from "@/components/documents/BulkUploadZone";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useOnboarding } from "@/components/onboarding/OnboardingProvider";
import { FileText, Lightbulb, Clock } from "lucide-react";

export default function UploadPage() {
  const { isFirstUpload } = useOnboarding();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Documenten uploaden</h1>
        <p className="text-muted-foreground">
          Upload een of meerdere PDF of DOCX bestanden
        </p>
      </div>

      {/* First-upload guidance banner */}
      {isFirstUpload && (
        <div className="rounded-lg border border-[#0062EB]/20 bg-[#0062EB]/5 p-5">
          <h3 className="mb-3 text-sm font-semibold text-[#0062EB]">
            Je eerste Smart Document!
          </h3>
          <div className="space-y-2.5">
            <div className="flex items-start gap-3">
              <FileText className="mt-0.5 h-4 w-4 shrink-0 text-[#0062EB]" />
              <p className="text-sm text-gray-700">
                <span className="font-medium">Ondersteunde formaten:</span> PDF en DOCX (max 25MB)
              </p>
            </div>
            <div className="flex items-start gap-3">
              <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-[#0062EB]" />
              <p className="text-sm text-gray-700">
                <span className="font-medium">Tip:</span> Hoe beter de bronkwaliteit, hoe beter het AI-resultaat
              </p>
            </div>
            <div className="flex items-start gap-3">
              <Clock className="mt-0.5 h-4 w-4 shrink-0 text-[#0062EB]" />
              <p className="text-sm text-gray-700">
                <span className="font-medium">Verwerkingstijd:</span> Meestal 1-3 minuten, afhankelijk van de grootte
              </p>
            </div>
          </div>
        </div>
      )}

      <Tabs defaultValue="single">
        <TabsList>
          <TabsTrigger value="single">Enkel document</TabsTrigger>
          <TabsTrigger value="bulk">Bulk upload</TabsTrigger>
        </TabsList>
        <TabsContent value="single" className="mt-6">
          <UploadZone />
        </TabsContent>
        <TabsContent value="bulk" className="mt-6">
          <BulkUploadZone />
        </TabsContent>
      </Tabs>
    </div>
  );
}

"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, Sparkles, Share2 } from "lucide-react";
import { useOnboarding } from "./OnboardingProvider";

export default function WelcomeModal() {
  const { data: session } = useSession();
  const { isOnboarding, step, nextStep, skipOnboarding } = useOnboarding();
  const router = useRouter();

  const isOpen = isOnboarding && step === "welcome";

  const firstName = session?.user?.name?.split(" ")[0] || "daar";

  function handleStartUpload() {
    nextStep();
    router.push("/dashboard/upload");
  }

  function handleExplore() {
    nextStep();
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && skipOnboarding()}>
      <DialogContent className="sm:max-w-lg" showCloseButton={false}>
        <DialogHeader className="text-center sm:text-center">
          <div className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-[#0062EB]/10">
            <Sparkles className="h-8 w-8 text-[#0062EB]" />
          </div>
          <DialogTitle className="text-2xl">
            Welkom bij doc1.ai, {firstName}!
          </DialogTitle>
          <DialogDescription className="text-base">
            Maak je documenten toegankelijk met AI. In 3 stappen heb je je
            eerste Smart Document klaar.
          </DialogDescription>
        </DialogHeader>

        {/* Steps */}
        <div className="my-4 space-y-4">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#0062EB] text-white text-sm font-bold">
              1
            </div>
            <div>
              <p className="font-medium">Upload een document</p>
              <p className="text-sm text-muted-foreground">
                Sleep een PDF of DOCX naar het uploadvenster
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#0062EB] text-white text-sm font-bold">
              2
            </div>
            <div>
              <p className="font-medium">AI verwerkt automatisch</p>
              <p className="text-sm text-muted-foreground">
                Samenvatting, begrippenlijst en taalniveaus worden gegenereerd
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#0062EB] text-white text-sm font-bold">
              3
            </div>
            <div>
              <p className="font-medium">Publiceer en deel</p>
              <p className="text-sm text-muted-foreground">
                Deel je Smart Document via een link of embed het op je website
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            className="flex-1 bg-[#0062EB] hover:bg-[#0050C0]"
            size="lg"
            onClick={handleStartUpload}
          >
            <Upload className="mr-2 h-4 w-4" />
            Upload je eerste document
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={handleExplore}
          >
            Eerst rondkijken
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

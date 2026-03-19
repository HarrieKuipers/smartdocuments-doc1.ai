"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

export type OnboardingStep =
  | "welcome"
  | "sidebar-tour"
  | "upload-guide"
  | "metadata-guide"
  | "processing-guide"
  | "completed";

interface OnboardingContextValue {
  isOnboarding: boolean;
  step: OnboardingStep;
  sidebarHighlight: number;
  nextStep: () => void;
  nextSidebarHighlight: () => void;
  skipOnboarding: () => void;
  isFirstUpload: boolean;
}

const OnboardingContext = createContext<OnboardingContextValue>({
  isOnboarding: false,
  step: "completed",
  sidebarHighlight: 0,
  nextStep: () => {},
  nextSidebarHighlight: () => {},
  skipOnboarding: () => {},
  isFirstUpload: false,
});

export function useOnboarding() {
  return useContext(OnboardingContext);
}

const SIDEBAR_ITEMS_COUNT = 5; // Dashboard, Documenten, Uploaden, Collecties, Analytics

export function OnboardingProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isOnboarding, setIsOnboarding] = useState(false);
  const [step, setStep] = useState<OnboardingStep>("completed");
  const [sidebarHighlight, setSidebarHighlight] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkOnboarding() {
      try {
        const res = await fetch("/api/user/onboarding");
        if (res.ok) {
          const data = await res.json();
          if (!data.onboardingCompleted) {
            setIsOnboarding(true);
            setStep("welcome");
          }
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    }
    checkOnboarding();
  }, []);

  const completeOnboarding = useCallback(async () => {
    setIsOnboarding(false);
    setStep("completed");
    try {
      await fetch("/api/user/onboarding", { method: "PATCH" });
    } catch {
      // silently fail
    }
  }, []);

  const nextStep = useCallback(() => {
    setStep((prev) => {
      switch (prev) {
        case "welcome":
          return "sidebar-tour";
        case "sidebar-tour":
          return "completed";
        case "upload-guide":
          return "metadata-guide";
        case "metadata-guide":
          return "processing-guide";
        case "processing-guide":
          completeOnboarding();
          return "completed";
        default:
          return "completed";
      }
    });
  }, [completeOnboarding]);

  const nextSidebarHighlight = useCallback(() => {
    setSidebarHighlight((prev) => {
      if (prev >= SIDEBAR_ITEMS_COUNT - 1) {
        setStep("completed");
        completeOnboarding();
        return 0;
      }
      return prev + 1;
    });
  }, [completeOnboarding]);

  const skipOnboarding = useCallback(() => {
    completeOnboarding();
  }, [completeOnboarding]);

  // Don't render children until we know onboarding status to prevent flash
  if (loading) return <>{children}</>;

  return (
    <OnboardingContext.Provider
      value={{
        isOnboarding,
        step,
        sidebarHighlight,
        nextStep,
        nextSidebarHighlight,
        skipOnboarding,
        isFirstUpload: isOnboarding,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}

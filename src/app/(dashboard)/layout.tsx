import SessionProvider from "@/components/common/SessionProvider";
import DashboardShell from "@/components/layout/DashboardShell";
import { OnboardingProvider } from "@/components/onboarding/OnboardingProvider";
import WelcomeModal from "@/components/onboarding/WelcomeModal";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      <OnboardingProvider>
        <DashboardShell>{children}</DashboardShell>
        <WelcomeModal />
      </OnboardingProvider>
    </SessionProvider>
  );
}

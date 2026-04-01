"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  FileText,
  Upload,
  FolderOpen,
  BarChart3,
  Settings,
  LogOut,
  ShieldCheck,
  Palette,
  Key,
  Webhook,
  Plug,
  Monitor,
  X,
} from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import OnboardingTooltip from "@/components/onboarding/OnboardingTooltip";
import { useOnboarding } from "@/components/onboarding/OnboardingProvider";

const navItems = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    tourTitle: "Dashboard",
    tourDesc: "Je startpagina met een overzicht van al je documenten, statistieken en snelle acties.",
  },
  {
    label: "Documenten",
    href: "/dashboard/documents",
    icon: FileText,
    tourTitle: "Documenten",
    tourDesc: "Beheer al je Smart Documents op één plek. Bewerk, publiceer of verwijder documenten.",
  },
  {
    label: "Uploaden",
    href: "/dashboard/upload",
    icon: Upload,
    tourTitle: "Uploaden",
    tourDesc: "Upload hier PDF of DOCX bestanden. AI verwerkt ze automatisch tot Smart Documents.",
  },
  {
    label: "Collecties",
    href: "/dashboard/collections",
    icon: FolderOpen,
    tourTitle: "Collecties",
    tourDesc: "Groepeer documenten in collecties en deel ze als geheel met je lezers.",
  },
  {
    label: "Widget Demo",
    href: "/dashboard/demo",
    icon: Monitor,
  },
  {
    label: "Analytics",
    href: "/dashboard/analytics",
    icon: BarChart3,
    tourTitle: "Analytics",
    tourDesc: "Bekijk hoe je documenten presteren: views, leestijd en interacties.",
  },
  {
    label: "Sjablonen",
    href: "/dashboard/settings/sjablonen",
    icon: Palette,
  },
  {
    label: "Instellingen",
    href: "/dashboard/settings",
    icon: Settings,
  },
];

interface SidebarProps {
  onNavigate?: () => void;
}

export default function Sidebar({ onNavigate }: SidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isSuperAdmin = session?.user?.isSuperAdmin;
  const { isOnboarding, step, sidebarHighlight, nextSidebarHighlight, skipOnboarding } =
    useOnboarding();

  const isTour = isOnboarding && step === "sidebar-tour";

  return (
    <aside className="flex h-screen w-64 flex-col border-r bg-white">
      {/* Logo + close button */}
      <div className="flex h-14 items-center justify-between border-b px-6 md:h-16">
        <Link href="/dashboard" className="flex items-center gap-2" onClick={onNavigate}>
          <Image
            src="/logo_doc1_v2.svg"
            alt="DOC1"
            width={120}
            height={45}
            priority
          />
        </Link>
        {onNavigate && (
          <button
            onClick={onNavigate}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 lg:hidden"
            aria-label="Menu sluiten"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {navItems.map((item, index) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" &&
              item.href !== "/dashboard/settings" &&
              pathname.startsWith(item.href));

          const showTooltip = isTour && item.tourTitle && index === sidebarHighlight;

          const link = (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-[#0062EB]/10 text-[#0062EB]"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );

          if (item.tourTitle) {
            return (
              <OnboardingTooltip
                key={item.href}
                show={!!showTooltip}
                title={item.tourTitle}
                description={item.tourDesc!}
                onNext={nextSidebarHighlight}
                onDismiss={skipOnboarding}
                position="right"
                nextLabel={index >= 4 ? "Klaar!" : "Volgende"}
              >
                {link}
              </OnboardingTooltip>
            );
          }

          return link;
        })}

        {/* API & Integrations links — visible to all, gated on the pages */}
        <div className="my-2 border-t border-gray-200" />
        <p className="px-3 py-1 text-xs font-semibold text-gray-400 uppercase">
          API & Integraties
        </p>
        {[
          { label: "API Sleutels", href: "/dashboard/settings/api", icon: Key },
          { label: "Webhooks", href: "/dashboard/settings/webhooks", icon: Webhook },
          { label: "Integraties", href: "/dashboard/settings/integraties", icon: Plug },
        ].map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-[#0062EB]/10 text-[#0062EB]"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}

        {/* Admin link for superadmins */}
        {isSuperAdmin && (
          <>
            <div className="my-2 border-t border-gray-200" />
            <Link
              href="/admin"
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                pathname.startsWith("/admin")
                  ? "bg-[#0062EB]/10 text-[#0062EB]"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              )}
            >
              <ShieldCheck className="h-4 w-4" />
              Admin
            </Link>
          </>
        )}
      </nav>

      {/* Logout */}
      <div className="border-t p-3">
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
        >
          <LogOut className="h-4 w-4" />
          Uitloggen
        </button>
      </div>
    </aside>
  );
}

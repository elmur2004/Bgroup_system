"use client";

import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { CommandPaletteProvider } from "@/components/layout/CommandPaletteProvider";
import { OnboardingWizard } from "@/components/onboarding/Wizard";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <CommandPaletteProvider>
      <div className="flex min-h-screen bg-background text-foreground">
        {/* Desktop sidebar (>= md) */}
        <div className="hidden md:flex">
          <Sidebar />
        </div>

        <div className="flex-1 flex flex-col min-w-0">
          <Header />
          {/* pb-16 on mobile so bottom-nav doesn't overlap the last row of content */}
          <main className="flex-1 bg-muted/30 pb-16 md:pb-0">
            <div className="px-4 md:px-6 py-4 md:py-6">{children}</div>
          </main>
        </div>

        <MobileBottomNav />
        <OnboardingWizard />
      </div>
    </CommandPaletteProvider>
  );
}

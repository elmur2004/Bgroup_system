"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState } from "react";
import {
  LayoutDashboard,
  Users,
  TrendingUp,
  Phone,
  Handshake,
  DollarSign,
  Briefcase,
  Clock,
  ClipboardList,
  Menu,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Sidebar } from "@/components/layout/Sidebar";

type NavItem = { href: string; label: string; icon: LucideIcon };

function navForModule(
  module: "hr" | "crm" | "partners" | null,
  hrRoles: string[] | undefined
): NavItem[] {
  if (module === "hr") {
    const isAdmin = hrRoles?.some((r) => ["super_admin", "hr_manager"].includes(r));
    if (isAdmin) {
      return [
        { href: "/hr/dashboard", label: "Home", icon: LayoutDashboard },
        { href: "/hr/employees", label: "People", icon: Users },
        { href: "/hr/attendance/today", label: "Today", icon: Clock },
        { href: "/hr/payroll/monthly", label: "Pay", icon: DollarSign },
      ];
    }
    return [
      { href: "/hr/employee/home", label: "Home", icon: LayoutDashboard },
      { href: "/hr/employee/attendance", label: "Time", icon: Clock },
      { href: "/hr/employee/overtime", label: "OT", icon: ClipboardList },
      { href: "/hr/employee/salary", label: "Pay", icon: DollarSign },
    ];
  }
  if (module === "crm") {
    return [
      { href: "/crm/my", label: "Home", icon: LayoutDashboard },
      { href: "/crm/opportunities", label: "Pipeline", icon: TrendingUp },
      { href: "/crm/calls", label: "Calls", icon: Phone },
      { href: "/crm/companies", label: "Companies", icon: Briefcase },
    ];
  }
  if (module === "partners") {
    return [
      { href: "/partners/dashboard", label: "Home", icon: LayoutDashboard },
      { href: "/partners/leads", label: "Leads", icon: Users },
      { href: "/partners/deals", label: "Deals", icon: Handshake },
      { href: "/partners/commissions", label: "Earn", icon: DollarSign },
    ];
  }
  // Fallback: cross-module home
  return [
    { href: "/today", label: "Today", icon: LayoutDashboard },
    { href: "/hr/dashboard", label: "HR", icon: Users },
    { href: "/crm/my", label: "CRM", icon: TrendingUp },
    { href: "/partners/dashboard", label: "Partners", icon: Handshake },
  ];
}

export function MobileBottomNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [moreOpen, setMoreOpen] = useState(false);

  const activeModule: "hr" | "crm" | "partners" | null = pathname.startsWith("/hr")
    ? "hr"
    : pathname.startsWith("/crm")
      ? "crm"
      : pathname.startsWith("/partners")
        ? "partners"
        : null;

  const items = navForModule(activeModule, session?.user?.hrRoles);

  function isActive(href: string) {
    if (pathname === href) return true;
    // Don't treat the module home as a prefix match for sub-pages.
    return pathname.startsWith(href + "/");
  }

  return (
    <>
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <ul className="grid grid-cols-5">
          {items.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex flex-col items-center justify-center gap-0.5 py-2 text-xs transition-colors",
                    active
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-[10px] leading-none">{item.label}</span>
                </Link>
              </li>
            );
          })}
          <li>
            <button
              onClick={() => setMoreOpen(true)}
              className="w-full flex flex-col items-center justify-center gap-0.5 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
              <span className="text-[10px] leading-none">More</span>
            </button>
          </li>
        </ul>
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="left" className="p-0 w-72">
          <Sidebar />
        </SheetContent>
      </Sheet>
    </>
  );
}

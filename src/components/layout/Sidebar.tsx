"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { ModuleSwitcher } from "./ModuleSwitcher";
import {
  // HR icons
  LayoutDashboard,
  Users,
  Clock,
  AlertTriangle,
  Gift,
  Timer,
  Wallet,
  FileBarChart,
  Settings,
  // CRM icons
  Kanban,
  Phone,
  CalendarCheck,
  Target,
  TrendingUp,
  Building2,
  Contact,
  Package,
  BarChart3,
  Trophy,
  HeartPulse,
  UserCog,
  Landmark,
  DollarSign,
  Layers,
  AlertCircle,
  Tag,
  // Partners icons
  Handshake,
  UserCheck,
  FileText,
  Receipt,
  Briefcase,
  Bell,
  Shield,
  ClipboardList,
  ListTodo,
  // Layout icons
  ChevronLeft,
  ChevronRight,
  LogOut,
} from "lucide-react";
import { signOut } from "next-auth/react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  roles?: string[];
}

interface NavSection {
  title?: string;
  items: NavItem[];
}

// ─── HR Navigation ─────────────────────────────────────────────────

function getHrNav(roles: string[]): NavSection[] {
  const isAdmin = roles.includes("super_admin") || roles.includes("hr_manager");
  const isCEO = roles.includes("ceo");
  const isTeamLead = roles.includes("team_lead");
  const isAccountant = roles.includes("accountant");
  const isEmployee = roles.includes("employee");

  const sections: NavSection[] = [];

  if (isAdmin) {
    sections.push({
      items: [
        { href: "/admin/board", label: "Group board", icon: BarChart3 },
        { href: "/hr/dashboard", label: "Dashboard", icon: LayoutDashboard },
        { href: "/hr/employees", label: "Employees", icon: Users },
        { href: "/hr/org-chart", label: "Org chart", icon: Users },
        { href: "/tasks", label: "Tasks", icon: ListTodo },
      ],
    });
    sections.push({
      title: "Management",
      items: [
        { href: "/hr/attendance/today", label: "Attendance", icon: Clock },
        { href: "/hr/calendar", label: "Time-off", icon: Clock },
        { href: "/hr/overtime/pending", label: "Overtime", icon: Timer },
        { href: "/hr/incidents/all", label: "Incidents", icon: AlertTriangle },
        { href: "/hr/bonuses/all", label: "Bonuses", icon: Gift },
        { href: "/hr/payroll/monthly", label: "Payroll", icon: Wallet },
      ],
    });
    sections.push({
      title: "Reports",
      items: [
        { href: "/hr/reports/excel", label: "Reports", icon: FileBarChart },
        { href: "/admin/onboarding-templates", label: "Onboarding templates", icon: ClipboardList },
        { href: "/admin/workflows-sequential", label: "Workflows", icon: Layers },
        { href: "/hr/settings", label: "Settings", icon: Settings },
      ],
    });
  }

  if (isCEO) {
    sections.push({
      items: [
        { href: "/hr/management", label: "Overview", icon: LayoutDashboard },
        { href: "/hr/employees", label: "Employees", icon: Users },
        { href: "/hr/payroll/monthly", label: "Payroll", icon: Wallet },
      ],
    });
  }

  if (isTeamLead) {
    sections.push({
      items: [
        { href: "/hr/team", label: "My Team", icon: Users },
      ],
    });
  }

  if (isAccountant) {
    sections.push({
      items: [
        { href: "/hr/accountant", label: "Payroll", icon: Wallet },
      ],
    });
  }

  if (isEmployee) {
    sections.push({
      items: [
        { href: "/hr/employee/home", label: "Home", icon: LayoutDashboard },
        { href: "/hr/employee/attendance", label: "My Attendance", icon: Clock },
        { href: "/hr/employee/overtime", label: "My Overtime", icon: Timer },
        { href: "/hr/employee/salary", label: "My Salary", icon: Wallet },
        { href: "/hr/employee/incidents", label: "My Incidents", icon: AlertTriangle },
        { href: "/tasks", label: "My Tasks", icon: ListTodo },
        { href: "/hr/employee/profile", label: "Profile", icon: UserCog },
      ],
    });
  }

  return sections;
}

// ─── CRM Navigation ──────────────────────────────────────���─────────

function getCrmNav(crmRole?: string): NavSection[] {
  const sections: NavSection[] = [];
  const isManager = crmRole === "MANAGER" || crmRole === "CEO" || crmRole === "ADMIN";

  sections.push({
    title: "My Work",
    items: [
      { href: "/crm/my", label: "Dashboard", icon: LayoutDashboard },
      { href: "/crm/my/calls", label: "My Calls", icon: Phone },
      { href: "/tasks", label: "My Tasks", icon: ListTodo },
      { href: "/tasks/calendar", label: "Tasks calendar", icon: CalendarCheck },
    ],
  });

  sections.push({
    title: "CRM",
    items: [
      { href: "/crm/sales-board", label: "Sales board", icon: BarChart3 },
      { href: "/crm/opportunities", label: "Opportunities", icon: TrendingUp },
      { href: "/crm/companies", label: "Companies", icon: Building2 },
      { href: "/crm/contacts", label: "Contacts", icon: Contact },
      { href: "/crm/meetings", label: "Meetings", icon: CalendarCheck },
      { href: "/crm/meetings/calendar", label: "Weekly calendar", icon: CalendarCheck },
      ...(isManager ? [{ href: "/crm/calls", label: "All Calls", icon: Phone }] : []),
      { href: "/crm/products", label: "Products", icon: Package },
    ],
  });

  if (isManager) {
    sections.push({
      title: "Group",
      items: [
        { href: "/crm/group", label: "Dashboard", icon: BarChart3 },
        { href: "/crm/group/leaderboard", label: "Leaderboard", icon: Trophy },
        { href: "/crm/group/forecast", label: "Forecast", icon: TrendingUp },
        { href: "/crm/group/health", label: "Health", icon: HeartPulse },
      ],
    });
  }

  if (crmRole === "CEO" || crmRole === "ADMIN") {
    sections.push({
      title: "Admin",
      items: [
        { href: "/crm/admin/users", label: "Users", icon: UserCog },
        { href: "/crm/admin/entities", label: "Entities", icon: Landmark },
        { href: "/crm/admin/fx-rates", label: "FX Rates", icon: DollarSign },
        { href: "/crm/admin/stage-config", label: "Stages", icon: Layers },
        { href: "/crm/admin/loss-reasons", label: "Loss Reasons", icon: AlertCircle },
        { href: "/crm/admin/lead-sources", label: "Lead Sources", icon: Tag },
      ],
    });
  }

  return sections;
}

// ─── Partners Navigation ───────────────────────────────────────────

function getPartnersNav(isAdmin: boolean): NavSection[] {
  if (isAdmin) {
    return [
      {
        items: [
          { href: "/partners/dashboard", label: "Dashboard", icon: LayoutDashboard },
          { href: "/partners/admin/partners", label: "Partners", icon: Users },
          { href: "/partners/admin/contracts", label: "Contracts", icon: FileText },
          { href: "/partners/admin/invoices", label: "Invoices", icon: Receipt },
          { href: "/partners/admin/commissions", label: "Commissions", icon: DollarSign },
          { href: "/partners/services", label: "Services", icon: Briefcase },
          { href: "/tasks", label: "Tasks", icon: ListTodo },
          { href: "/partners/admin/audit-logs", label: "Audit Logs", icon: ClipboardList },
        ],
      },
    ];
  }

  return [
    {
      items: [
        { href: "/partners/dashboard", label: "Dashboard", icon: LayoutDashboard },
        { href: "/partners/leads", label: "Leads", icon: Users },
        { href: "/partners/clients", label: "Clients", icon: UserCheck },
        { href: "/partners/deals", label: "Deals", icon: Handshake },
        { href: "/partners/contracts", label: "Contracts", icon: FileText },
        { href: "/partners/invoices", label: "Invoices", icon: Receipt },
        { href: "/partners/commissions", label: "Commissions", icon: DollarSign },
        { href: "/partners/services", label: "Services", icon: Briefcase },
        { href: "/tasks", label: "My Tasks", icon: ListTodo },
      ],
    },
    {
      items: [
        { href: "/partners/notifications", label: "Notifications", icon: Bell },
        { href: "/partners/settings", label: "Settings", icon: Settings },
      ],
    },
  ];
}

// ─── Main Sidebar Component ────────────────────────────────────────

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [collapsed, setCollapsed] = useState(false);

  const modules = session?.user?.modules || [];

  // Detect active module from pathname.
  let detected: "hr" | "crm" | "partners" | null = null;
  if (pathname.startsWith("/hr")) detected = "hr";
  else if (pathname.startsWith("/crm")) detected = "crm";
  else if (pathname.startsWith("/partners")) detected = "partners";

  // Persist the last module the user was inside so cross-module pages
  // (/tasks, /admin/*, /today, /account/*) keep the previous module's nav
  // instead of going blank. Falls back to the first available module, then HR.
  const [lastModule, setLastModule] = useState<"hr" | "crm" | "partners">(() => {
    if (typeof window !== "undefined") {
      const stored = window.localStorage.getItem("bgroup.activeModule");
      if (stored === "hr" || stored === "crm" || stored === "partners") return stored;
    }
    return "hr";
  });

  useEffect(() => {
    if (detected && detected !== lastModule) {
      setLastModule(detected);
      if (typeof window !== "undefined") {
        window.localStorage.setItem("bgroup.activeModule", detected);
      }
    }
  }, [detected, lastModule]);

  const activeModule: "hr" | "crm" | "partners" =
    detected ?? (modules.includes(lastModule) ? lastModule : (modules[0] as "hr" | "crm" | "partners" | undefined) ?? "hr");

  // Get nav sections for active module.
  let sections: NavSection[] = [];
  if (activeModule === "hr") {
    const hrRoles = session?.user?.hrRoles || [];
    sections = getHrNav(hrRoles);
  } else if (activeModule === "crm") {
    sections = getCrmNav(session?.user?.crmRole);
  } else if (activeModule === "partners") {
    const isPartnersAdmin = !session?.user?.partnerId;
    sections = getPartnersNav(isPartnersAdmin);
  }

  function isActive(href: string) {
    if (href === pathname) return true;
    // Don't match base module routes as prefix
    const basePaths = ["/hr/dashboard", "/crm/my", "/partners/dashboard"];
    if (basePaths.includes(href)) return pathname === href;
    return pathname.startsWith(href);
  }

  const CollapseIcon = collapsed ? ChevronRight : ChevronLeft;

  return (
    <aside
      className={cn(
        "flex flex-col border-r bg-sidebar text-sidebar-foreground h-screen sticky top-0 transition-all duration-200",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo + Module Switcher */}
      <div className="flex items-center justify-between px-3 h-16 border-b">
        {!collapsed && (
          <Link href="/" className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-primary-gradient flex items-center justify-center text-primary-foreground font-bold text-base shadow-sm">
              B
            </div>
            <span className="font-bold text-lg tracking-tight">BGroup</span>
          </Link>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-lg hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
        >
          <CollapseIcon className="h-4 w-4" />
        </button>
      </div>

      {/* Module Switcher */}
      {modules.length > 0 && (
        <div className="px-2 py-2 border-b">
          <ModuleSwitcher collapsed={collapsed} />
        </div>
      )}

      {/* Navigation */}
      <ScrollArea className="flex-1 py-2">
        <nav className="space-y-1 px-2">
          {sections.map((section, sIdx) => (
            <div key={sIdx}>
              {sIdx > 0 && <Separator className="my-2" />}
              {section.title && !collapsed && (
                <div className="px-3 py-1 text-xs font-semibold text-muted-foreground uppercase">
                  {section.title}
                </div>
              )}
              {section.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all",
                      active
                        ? "bg-primary-gradient text-primary-foreground font-medium shadow-sm"
                        : "text-sidebar-foreground/85 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                      collapsed && "justify-center px-2"
                    )}
                    title={collapsed ? item.label : undefined}
                  >
                    {/* Active indicator stripe on the left */}
                    {active && !collapsed && (
                      <span className="absolute -left-2 top-1/2 -translate-y-1/2 h-5 w-1 rounded-full bg-primary-gradient" aria-hidden />
                    )}
                    <Icon className={cn("h-5 w-5 shrink-0", active ? "text-primary-foreground" : "text-current opacity-80")} />
                    {!collapsed && <span>{item.label}</span>}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
      </ScrollArea>

      {/* User + Logout */}
      <div className="border-t p-3">
        {session?.user && !collapsed && (
          <div className="flex items-center gap-3 mb-3">
            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium shrink-0">
              {session.user.name?.charAt(0) || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{session.user.name}</p>
              <p className="text-xs text-muted-foreground truncate">{session.user.email}</p>
            </div>
          </div>
        )}
        <button
          onClick={() => signOut({ redirectTo: "/login" })}
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-lg text-sm w-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors",
            collapsed && "justify-center px-2"
          )}
          title={collapsed ? "Logout" : undefined}
        >
          <LogOut className="h-5 w-5 shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}

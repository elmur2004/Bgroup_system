"use client";

import { useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  Users,
  TrendingUp,
  Handshake,
  ChevronDown,
} from "lucide-react";

interface ModuleInfo {
  id: "hr" | "crm" | "partners";
  label: string;
  icon: React.ElementType;
  defaultRoute: string;
  color: string;
}

const MODULES: ModuleInfo[] = [
  { id: "hr", label: "HR System", icon: Users, defaultRoute: "/hr/dashboard", color: "text-indigo-600" },
  { id: "crm", label: "CRM", icon: TrendingUp, defaultRoute: "/crm/my", color: "text-emerald-600" },
  { id: "partners", label: "Partners", icon: Handshake, defaultRoute: "/partners/dashboard", color: "text-amber-600" },
];

export function ModuleSwitcher({ collapsed }: { collapsed: boolean }) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const userModules = session?.user?.modules || [];
  const availableModules = MODULES.filter((m) => userModules.includes(m.id));

  // Detect active module from pathname
  const activeModule = MODULES.find((m) => pathname.startsWith(`/${m.id}`)) || availableModules[0];

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (availableModules.length <= 1) {
    // Single module — just show the label
    const mod = activeModule || availableModules[0];
    if (!mod) return null;
    const Icon = mod.icon;
    return (
      <div className={cn("flex items-center gap-2 px-3 py-2", collapsed && "justify-center px-0")}>
        <Icon className={cn("h-5 w-5", mod.color)} />
        {!collapsed && <span className="font-semibold text-sm">{mod.label}</span>}
      </div>
    );
  }

  const Icon = activeModule?.icon || Users;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-lg w-full hover:bg-accent transition-colors",
          collapsed && "justify-center px-2"
        )}
      >
        <Icon className={cn("h-5 w-5", activeModule?.color)} />
        {!collapsed && (
          <>
            <span className="font-semibold text-sm flex-1 text-left">{activeModule?.label}</span>
            <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
          </>
        )}
      </button>

      {open && (
        <div className={cn(
          "absolute z-50 mt-1 w-48 rounded-lg border bg-popover p-1 shadow-md",
          collapsed ? "left-full ml-2 top-0" : "left-0 top-full"
        )}>
          {availableModules.map((mod) => {
            const ModIcon = mod.icon;
            const isActive = activeModule?.id === mod.id;
            return (
              <button
                key={mod.id}
                onClick={() => {
                  router.push(mod.defaultRoute);
                  setOpen(false);
                }}
                className={cn(
                  "flex items-center gap-2 w-full px-3 py-2 rounded-md text-sm transition-colors",
                  isActive ? "bg-accent font-medium" : "hover:bg-accent/50"
                )}
              >
                <ModIcon className={cn("h-4 w-4", mod.color)} />
                <span>{mod.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

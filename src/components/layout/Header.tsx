"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { Search, Sun, Moon } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useCommandPalette } from "@/components/layout/CommandPaletteProvider";
import { NotificationCenter } from "@/components/layout/NotificationCenter";

/** Cuid / ULID / UUID — any of these means this segment is an entity id, not a navigable category. */
function looksLikeId(segment: string): boolean {
  return (
    /^c[a-z0-9]{20,}$/.test(segment) || // cuid (Prisma default)
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment) || // uuid
    /^\d+$/.test(segment) // pure numeric id
  );
}

function getBreadcrumbs(pathname: string): { label: string; href?: string }[] {
  const parts = pathname.split("/").filter(Boolean);
  const crumbs: { label: string; href?: string }[] = [];

  // Module root.
  if (parts[0] === "hr") crumbs.push({ label: "HR", href: "/hr/dashboard" });
  else if (parts[0] === "crm") crumbs.push({ label: "CRM", href: "/crm/my" });
  else if (parts[0] === "partners") crumbs.push({ label: "Partners", href: "/partners/dashboard" });
  else if (parts[0] === "tasks") crumbs.push({ label: "Tasks", href: "/tasks" });
  else if (parts[0] === "admin") crumbs.push({ label: "Admin", href: "/admin/board" });

  // Sub-pages — accumulate href as we walk, skip id-like and bracket segments.
  let cursor = "/" + (parts[0] ?? "");
  for (let i = 1; i < parts.length; i++) {
    const part = parts[i];
    cursor += "/" + part;
    if (part.startsWith("[")) continue; // dynamic segment marker
    if (looksLikeId(part)) continue; // entity id — don't render as a crumb
    const label = part
      .replace(/-/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
    crumbs.push({ label, href: cursor });
  }

  return crumbs;
}

export function Header() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { setOpen } = useCommandPalette();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const breadcrumbs = getBreadcrumbs(pathname);

  // next-themes resolves on the client only; gate the icon swap to avoid hydration mismatch.
  useEffect(() => setMounted(true), []);

  // Reference session so existing imports remain meaningful for future work
  // (notification center, role-aware breadcrumbs).
  void session;

  const isMac =
    typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);
  const shortcutLabel = isMac ? "⌘K" : "Ctrl K";
  const isDark = mounted && resolvedTheme === "dark";

  return (
    <header className="h-14 border-b bg-background flex items-center justify-between px-6">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-1 text-sm" aria-label="Breadcrumb">
        {breadcrumbs.map((crumb, i) => {
          const isLast = i === breadcrumbs.length - 1;
          return (
            <span key={i} className="flex items-center gap-1">
              {i > 0 && <span className="text-muted-foreground mx-1">/</span>}
              {isLast || !crumb.href ? (
                <span className={isLast ? "font-medium" : "text-muted-foreground"}>
                  {crumb.label}
                </span>
              ) : (
                <Link
                  href={crumb.href}
                  className="text-muted-foreground hover:text-foreground hover:underline transition-colors"
                >
                  {crumb.label}
                </Link>
              )}
            </span>
          );
        })}
      </nav>

      {/* Right section */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-2 text-muted-foreground"
          onClick={() => setOpen(true)}
          aria-label="Open command palette"
        >
          <Search className="h-4 w-4" />
          <span className="hidden sm:inline">Search…</span>
          <kbd className="hidden sm:inline-flex items-center px-1.5 h-5 rounded bg-muted text-xs font-mono">
            {shortcutLabel}
          </kbd>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          aria-label="Toggle theme"
          onClick={() => setTheme(isDark ? "light" : "dark")}
        >
          {mounted ? (
            isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />
          ) : (
            // Render an inert placeholder during SSR to keep widths stable.
            <Sun className="h-4 w-4 opacity-0" />
          )}
        </Button>
        <NotificationCenter />
      </div>
    </header>
  );
}

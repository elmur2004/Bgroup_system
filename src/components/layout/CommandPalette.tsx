"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useTheme } from "next-themes";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Building2,
  User,
  Briefcase,
  Users,
  Handshake,
  ArrowRight,
} from "lucide-react";
import { actionsForSession } from "@/lib/commands/registry";
import type { GlobalSearchResult } from "@/app/api/global-search/route";

const TYPE_ICONS: Partial<Record<GlobalSearchResult["type"], typeof Building2>> = {
  company: Building2,
  contact: User,
  opportunity: Briefcase,
  employee: User,
  "hr-company": Building2,
  "hr-department": Briefcase,
  lead: User,
  client: Users,
  deal: Handshake,
  partner: Building2,
};

const TYPE_GROUP_LABEL: Record<GlobalSearchResult["type"], string> = {
  company: "CRM · Companies",
  contact: "CRM · Contacts",
  opportunity: "CRM · Opportunities",
  employee: "HR · Employees",
  "hr-company": "HR · Companies",
  "hr-department": "HR · Departments",
  lead: "Partners · Leads",
  client: "Partners · Clients",
  deal: "Partners · Deals",
  partner: "Partners · Partners",
};

export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const { data: session } = useSession();
  const { setTheme } = useTheme();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GlobalSearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  const actions = useMemo(() => actionsForSession(session), [session]);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/global-search?q=${encodeURIComponent(q)}`);
      if (!res.ok) throw new Error("search failed");
      const data = (await res.json()) as { results: GlobalSearchResult[] };
      setResults(data.results || []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => search(query), 200);
    return () => clearTimeout(t);
  }, [query, search]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
    }
  }, [open]);

  const lower = query.toLowerCase();
  const matchedActions = lower.length === 0
    ? actions.slice(0, 6) // a small "default" list when input is empty
    : actions.filter((a) => {
        const hay = [a.label, a.group, ...(a.keywords ?? [])].join(" ").toLowerCase();
        return hay.includes(lower);
      });

  // Group actions by their `group` field, preserving registry order within each group.
  const actionsByGroup = matchedActions.reduce<Record<string, typeof matchedActions>>(
    (acc, a) => {
      (acc[a.group] ||= []).push(a);
      return acc;
    },
    {}
  );

  // Group entity results by `type` for nicer headings.
  const resultsByType = results.reduce<Record<string, GlobalSearchResult[]>>(
    (acc, r) => {
      (acc[r.type] ||= []).push(r);
      return acc;
    },
    {}
  );

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Search or run a command…"
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        {query.length >= 2 && results.length === 0 && matchedActions.length === 0 && !loading && (
          <CommandEmpty>No results.</CommandEmpty>
        )}

        {/* Actions */}
        {Object.entries(actionsByGroup).map(([group, items]) => (
          <CommandGroup key={`actions-${group}`} heading={group}>
            {items.map((a) => {
              const Icon = a.icon ?? ArrowRight;
              return (
                <CommandItem
                  key={a.id}
                  value={`action ${a.label} ${a.keywords?.join(" ") ?? ""}`}
                  onSelect={() => {
                    onOpenChange(false);
                    void a.perform({
                      router,
                      setTheme,
                      signOut: async () => {
                        await signOut({ redirectTo: "/login" });
                      },
                    });
                  }}
                >
                  <Icon className="h-4 w-4 me-2 shrink-0" />
                  <span>{a.label}</span>
                </CommandItem>
              );
            })}
          </CommandGroup>
        ))}

        {/* Separator only when both sections are non-empty */}
        {Object.keys(actionsByGroup).length > 0 &&
          Object.keys(resultsByType).length > 0 && <CommandSeparator />}

        {/* Entity results */}
        {Object.entries(resultsByType).map(([type, items]) => {
          const Icon = TYPE_ICONS[type as GlobalSearchResult["type"]] ?? ArrowRight;
          return (
            <CommandGroup
              key={`results-${type}`}
              heading={TYPE_GROUP_LABEL[type as GlobalSearchResult["type"]] ?? type}
            >
              {items.map((r) => (
                <CommandItem
                  key={r.id}
                  value={`${r.type} ${r.label} ${r.sublabel ?? ""}`}
                  onSelect={() => {
                    router.push(r.href);
                    onOpenChange(false);
                  }}
                >
                  <Icon className="h-4 w-4 me-2 shrink-0" />
                  <div className="flex flex-col">
                    <span>{r.label}</span>
                    {r.sublabel && (
                      <span className="text-xs text-muted-foreground">{r.sublabel}</span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          );
        })}
      </CommandList>
    </CommandDialog>
  );
}

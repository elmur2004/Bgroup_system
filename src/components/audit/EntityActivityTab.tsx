"use client";

import { useEffect, useState } from "react";
import { ScrollText } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import type { UnifiedAuditEntry } from "@/app/api/audit-logs/route";

/**
 * Renders the activity timeline for a single entity. Drop into entity-detail
 * pages as a tab or drawer.
 *
 * Consumers must pass the canonical (module, entity, entityId) triple — the
 * server route enforces module-specific RBAC.
 */
export function EntityActivityTab({
  module,
  entity,
  entityId,
}: {
  module: "hr" | "partners";
  entity: string;
  entityId: string;
}) {
  const [entries, setEntries] = useState<UnifiedAuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/audit-logs/${module}/${encodeURIComponent(entity)}/${encodeURIComponent(entityId)}`)
      .then((r) => (r.ok ? r.json() : { entries: [] }))
      .then((data: { entries: UnifiedAuditEntry[] }) => {
        if (!cancelled) setEntries(data.entries ?? []);
      })
      .catch(() => !cancelled && setEntries([]))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [module, entity, entityId]);

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <EmptyState
        size="sm"
        icon={ScrollText}
        title="No activity yet"
        description="Edits and reviews will be recorded here."
      />
    );
  }

  return (
    <ol className="relative ms-3 border-s border-border">
      {entries.map((e) => (
        <li key={e.id} className="ms-4 pb-4">
          <span className="absolute -start-1.5 mt-2 h-3 w-3 rounded-full bg-primary/70 ring-2 ring-background" />
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-sm font-medium text-foreground">
              {e.action}
              {e.fieldName ? (
                <span className="text-muted-foreground font-normal"> · {e.fieldName}</span>
              ) : null}
            </span>
            <span className="text-xs text-muted-foreground tabular-nums">
              {new Date(e.timestamp).toLocaleString()}
            </span>
          </div>
          {e.fieldName && (
            <p className="text-xs text-muted-foreground mt-0.5">
              <span className="line-through">{e.oldValue || "∅"}</span>
              {" → "}
              <span className="text-foreground">{e.newValue || "∅"}</span>
            </p>
          )}
          {!e.fieldName && e.newValue && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{e.newValue}</p>
          )}
          <p className="text-xs text-muted-foreground mt-0.5">
            by {e.userLabel ?? e.userId ?? "system"}
          </p>
        </li>
      ))}
    </ol>
  );
}

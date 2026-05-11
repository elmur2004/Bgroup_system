"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/EmptyState";
import { ScrollText } from "lucide-react";
import type { UnifiedAuditEntry } from "@/app/api/audit-logs/route";

type AvailableModule = "hr" | "partners";

export function AuditTrailClient({
  availableModules,
}: {
  availableModules: readonly AvailableModule[];
}) {
  const [moduleFilter, setModuleFilter] = useState<"all" | AvailableModule>("all");
  const [actionFilter, setActionFilter] = useState("");
  const [userFilter, setUserFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);
  const [entries, setEntries] = useState<UnifiedAuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const params = useMemo(() => {
    const u = new URLSearchParams();
    if (moduleFilter !== "all") u.set("module", moduleFilter);
    if (actionFilter) u.set("action", actionFilter);
    if (userFilter) u.set("userId", userFilter);
    if (startDate) u.set("startDate", startDate);
    if (endDate) u.set("endDate", endDate);
    u.set("page", String(page));
    return u.toString();
  }, [moduleFilter, actionFilter, userFilter, startDate, endDate, page]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/audit-logs?${params}`)
      .then((r) => r.json())
      .then((data: { entries: UnifiedAuditEntry[] }) => {
        if (!cancelled) setEntries(data.entries ?? []);
      })
      .catch(() => {
        if (!cancelled) setEntries([]);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [params]);

  return (
    <div className="space-y-3">
      {/* Filters */}
      <Card className="p-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
          <Select
            value={moduleFilter}
            onValueChange={(v) => {
              setPage(1);
              setModuleFilter((v ?? "all") as typeof moduleFilter);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Module" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All modules</SelectItem>
              {availableModules.map((m) => (
                <SelectItem key={m} value={m}>
                  {m === "hr" ? "HR" : "Partners"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            placeholder="Action (e.g. update, contract.approve)"
            value={actionFilter}
            onChange={(e) => {
              setPage(1);
              setActionFilter(e.target.value);
            }}
          />
          <Input
            placeholder="User ID"
            value={userFilter}
            onChange={(e) => {
              setPage(1);
              setUserFilter(e.target.value);
            }}
          />
          <Input
            type="date"
            value={startDate}
            onChange={(e) => {
              setPage(1);
              setStartDate(e.target.value);
            }}
          />
          <Input
            type="date"
            value={endDate}
            onChange={(e) => {
              setPage(1);
              setEndDate(e.target.value);
            }}
          />
        </div>
      </Card>

      {/* Results */}
      <Card className="p-0">
        {loading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>
        ) : entries.length === 0 ? (
          <EmptyState
            icon={ScrollText}
            title="No matching audit events"
            description="Try widening the filters or extending the date range."
          />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border">
              <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-2.5 w-44">When</th>
                <th className="px-4 py-2.5 w-20">Module</th>
                <th className="px-4 py-2.5">User</th>
                <th className="px-4 py-2.5">Action</th>
                <th className="px-4 py-2.5">Entity</th>
                <th className="px-4 py-2.5">Change</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {entries.map((e) => (
                <tr key={`${e.module}-${e.id}`} className="hover:bg-muted/30">
                  <td className="px-4 py-2.5 text-muted-foreground tabular-nums">
                    {new Date(e.timestamp).toLocaleString()}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="text-[10px] uppercase tracking-wide bg-muted px-1.5 py-0.5 rounded">
                      {e.module}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">{e.userLabel ?? e.userId ?? "—"}</td>
                  <td className="px-4 py-2.5 font-medium text-foreground">{e.action}</td>
                  <td className="px-4 py-2.5">
                    <span className="text-foreground">{e.entity}</span>
                    <span className="text-muted-foreground"> · </span>
                    <span className="text-muted-foreground font-mono text-xs">
                      {e.entityId.slice(-8)}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground max-w-md">
                    {e.fieldName ? (
                      <span>
                        <span className="text-foreground">{e.fieldName}</span>
                        {": "}
                        <span className="line-through">{e.oldValue || "∅"}</span>
                        {" → "}
                        <span className="text-foreground">{e.newValue || "∅"}</span>
                      </span>
                    ) : e.newValue ? (
                      <span className="line-clamp-1">{e.newValue}</span>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          Showing {entries.length} entries (page {page})
        </span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={entries.length < 50}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}

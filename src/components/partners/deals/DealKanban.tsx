"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Kanban, type KanbanColumn } from "@/components/shared/Kanban/Kanban";
import { api } from "@/lib/partners/api";
import type { Deal } from "@/lib/partners/types";

type DealStatus = "PENDING" | "WON" | "LOST";

const COLUMNS: KanbanColumn<DealStatus>[] = [
  { id: "PENDING", title: "Pending", headerClass: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300" },
  { id: "WON", title: "Won", headerClass: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" },
  { id: "LOST", title: "Lost", headerClass: "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300" },
];

export function DealKanban({
  deals,
  onChange,
}: {
  deals: Deal[];
  /** Called after a successful move so the parent can refetch / refresh totals. */
  onChange?: () => void;
}) {
  const router = useRouter();
  const [items, setItems] = useState(() =>
    deals.map((d) => ({ ...d, columnId: d.status as DealStatus }))
  );

  const columns: KanbanColumn<DealStatus>[] = useMemo(
    () =>
      COLUMNS.map((c) => {
        const colItems = items.filter((i) => i.columnId === c.id);
        const total = colItems.reduce((sum, i) => sum + i.value, 0);
        return {
          ...c,
          subtitle:
            colItems.length > 0
              ? `${colItems.length} · $${Math.round(total).toLocaleString()}`
              : "0",
        };
      }),
    [items]
  );

  async function handleMove(
    item: typeof items[number],
    toStatus: DealStatus,
    fromStatus: DealStatus
  ) {
    // Block illegal transitions client-side (server enforces too).
    // PENDING ↔ WON, PENDING ↔ LOST allowed; WON ↔ LOST not allowed.
    if (
      (fromStatus === "WON" && toStatus === "LOST") ||
      (fromStatus === "LOST" && toStatus === "WON")
    ) {
      toast.error("Cannot move directly between WON and LOST");
      return;
    }

    // Optimistic
    setItems((prev) =>
      prev.map((i) =>
        i.id === item.id ? { ...i, columnId: toStatus, status: toStatus } : i
      )
    );

    try {
      await api.patch(`/deals/${item.id}`, { status: toStatus });
      toast.success(`Moved to ${toStatus.toLowerCase()}`);
      onChange?.();
      router.refresh();
    } catch (e) {
      // Rollback
      setItems((prev) =>
        prev.map((i) =>
          i.id === item.id ? { ...i, columnId: fromStatus, status: fromStatus } : i
        )
      );
      toast.error(e instanceof Error ? e.message : "Failed to move card");
    }
  }

  return (
    <Kanban
      columns={columns}
      items={items}
      onMove={handleMove}
      renderCard={(item) => (
        <div
          className="rounded border bg-background p-3 hover:border-primary/50 transition-colors"
          onClick={() => router.push(`/partners/deals/${item.id}`)}
        >
          <div className="font-medium text-sm">{item.client?.name ?? "—"}</div>
          <div className="text-xs text-muted-foreground mb-2">
            {item.service?.name ?? "—"}
          </div>
          <div className="text-sm font-semibold">${item.value.toLocaleString()}</div>
          {item.notes && (
            <div className="text-xs text-muted-foreground mt-2 line-clamp-2">
              {item.notes}
            </div>
          )}
        </div>
      )}
    />
  );
}

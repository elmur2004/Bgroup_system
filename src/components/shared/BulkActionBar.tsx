"use client";

import { type ReactNode } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type BulkActionBarProps = {
  /** How many rows are currently selected. Bar is hidden if 0. */
  selectedCount: number;
  /** Clear the selection. */
  onClear: () => void;
  /** Buttons / actions, rendered right-aligned. */
  actions: ReactNode;
  /** Optional label override (default: "{n} selected"). */
  label?: string;
  className?: string;
};

/**
 * Sticky context bar that appears above a table when one or more rows are
 * selected. Pair with a multi-select column on the data table.
 */
export function BulkActionBar({
  selectedCount,
  onClear,
  actions,
  label,
  className,
}: BulkActionBarProps) {
  if (selectedCount === 0) return null;
  return (
    <div
      className={cn(
        "sticky top-0 z-10 flex items-center justify-between gap-3 px-4 py-2 rounded-lg border border-primary/40 bg-primary/5 mb-3",
        className
      )}
    >
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onClear}
          aria-label="Clear selection"
        >
          <X className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium text-foreground">
          {label ?? `${selectedCount} selected`}
        </span>
      </div>
      <div className="flex items-center gap-2">{actions}</div>
    </div>
  );
}

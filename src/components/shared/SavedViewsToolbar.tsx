"use client";

import { useState, useEffect, useCallback } from "react";
import { Bookmark, BookmarkPlus, Trash2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export type SavedView<TFilters = unknown> = {
  id: string;
  scope: string;
  name: string;
  filters: TFilters;
  sort?: unknown;
  columns?: unknown;
  isShared: boolean;
  isDefault: boolean;
};

export type SavedViewsToolbarProps<TFilters> = {
  /** Stable key for this list, e.g. "crm:opportunities". */
  scope: string;
  /** Current filter state — what gets stored when the user saves a view. */
  currentFilters: TFilters;
  /** Apply a saved view's filters to the page. */
  onApply: (view: SavedView<TFilters>) => void;
};

export function SavedViewsToolbar<TFilters>({
  scope,
  currentFilters,
  onApply,
}: SavedViewsToolbarProps<TFilters>) {
  const [views, setViews] = useState<SavedView<TFilters>[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [saveOpen, setSaveOpen] = useState(false);
  const [name, setName] = useState("");

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/saved-views?scope=${encodeURIComponent(scope)}`);
      if (!res.ok) return;
      const data = (await res.json()) as { views: SavedView<TFilters>[] };
      setViews(data.views);
    } catch {
      // non-fatal
    }
  }, [scope]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function save() {
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    const res = await fetch("/api/saved-views", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scope, name: name.trim(), filters: currentFilters }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast.error(err.error || "Failed to save view");
      return;
    }
    toast.success("View saved");
    setName("");
    setSaveOpen(false);
    await refresh();
  }

  async function remove(id: string) {
    const res = await fetch(`/api/saved-views/${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Failed to delete view");
      return;
    }
    if (activeId === id) setActiveId(null);
    toast.success("View deleted");
    await refresh();
  }

  function handleSelect(id: string | null) {
    if (!id) {
      setActiveId(null);
      return;
    }
    setActiveId(id);
    const v = views.find((x) => x.id === id);
    if (v) onApply(v);
  }

  return (
    <div className="flex items-center gap-2">
      {views.length > 0 && (
        <Select value={activeId ?? undefined} onValueChange={handleSelect}>
          <SelectTrigger className="h-9 w-56">
            <Bookmark className="h-4 w-4 me-2 shrink-0" />
            <SelectValue placeholder="Saved views" />
          </SelectTrigger>
          <SelectContent>
            {views.map((v) => (
              <SelectItem key={v.id} value={v.id}>
                <div className="flex items-center justify-between w-full">
                  <span>{v.name}</span>
                  {v.isShared && (
                    <span className="ms-2 text-[10px] uppercase text-muted-foreground">
                      shared
                    </span>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <Button
        variant="outline"
        size="sm"
        className="h-9 gap-2"
        onClick={() => setSaveOpen(true)}
      >
        <BookmarkPlus className="h-4 w-4" />
        Save view
      </Button>

      {activeId && (
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 text-destructive"
          onClick={() => remove(activeId)}
          aria-label="Delete saved view"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      )}

      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Save current filters as a view</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Input
              autoFocus
              placeholder="e.g. My open opportunities"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && save()}
            />
            <p className="text-xs text-muted-foreground">
              The current filters and sort will be saved under this name.
            </p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSaveOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save}>
              <BookmarkPlus className="h-4 w-4 me-2" />
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

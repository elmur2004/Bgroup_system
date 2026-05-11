"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type Shortcut = { keys: string[]; label: string };
type ShortcutGroup = { title: string; shortcuts: Shortcut[] };

const GROUPS: ShortcutGroup[] = [
  {
    title: "Global",
    shortcuts: [
      { keys: ["⌘", "K"], label: "Open command palette" },
      { keys: ["?"], label: "Show this cheat sheet" },
      { keys: ["g", "h"], label: "Go to Today" },
      { keys: ["g", "e"], label: "Go to Employees" },
      { keys: ["g", "o"], label: "Go to Opportunities" },
      { keys: ["g", "d"], label: "Go to Deals" },
      { keys: ["g", "p"], label: "Go to Payroll" },
      { keys: ["t"], label: "Toggle dark / light theme" },
    ],
  },
  {
    title: "Lists & tables",
    shortcuts: [
      { keys: ["j"], label: "Move selection down" },
      { keys: ["k"], label: "Move selection up" },
      { keys: ["enter"], label: "Open selected row" },
      { keys: ["n"], label: "Create new (context-aware)" },
      { keys: ["/"], label: "Focus the search field" },
    ],
  },
];

export function ShortcutsCheatSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-2">
          {GROUPS.map((g) => (
            <div key={g.title}>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                {g.title}
              </h3>
              <ul className="space-y-1.5">
                {g.shortcuts.map((s, i) => (
                  <li key={i} className="flex items-center justify-between gap-3">
                    <span className="text-sm text-foreground">{s.label}</span>
                    <span className="flex items-center gap-1">
                      {s.keys.map((k, j) => (
                        <Kbd key={j}>{k}</Kbd>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Kbd({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        "inline-flex items-center justify-center min-w-6 h-6 px-1.5 rounded bg-muted text-xs font-mono text-foreground border-b border-border/80",
        className
      )}
    >
      {children}
    </kbd>
  );
}

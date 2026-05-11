"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { CommandPalette } from "./CommandPalette";
import { ShortcutsCheatSheet } from "@/components/shared/ShortcutsCheatSheet";
import { useGlobalShortcuts } from "@/lib/keyboard/shortcuts";

type CommandPaletteContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
};

const CommandPaletteContext = createContext<CommandPaletteContextValue | null>(null);

/**
 * Mounts the global ⌘K command palette + the keyboard shortcuts handler +
 * the "?" cheat-sheet dialog. One central key listener avoids double-binding.
 */
export function CommandPaletteProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [cheatOpen, setCheatOpen] = useState(false);

  useGlobalShortcuts({ setPaletteOpen: setOpen, setCheatOpen });

  return (
    <CommandPaletteContext.Provider
      value={{ open, setOpen, toggle: () => setOpen((v) => !v) }}
    >
      {children}
      <CommandPalette open={open} onOpenChange={setOpen} />
      <ShortcutsCheatSheet open={cheatOpen} onOpenChange={setCheatOpen} />
    </CommandPaletteContext.Provider>
  );
}

/** Open or close the global command palette from anywhere inside the dashboard. */
export function useCommandPalette(): CommandPaletteContextValue {
  const ctx = useContext(CommandPaletteContext);
  if (!ctx) {
    if (process.env.NODE_ENV === "development") {
      console.warn("useCommandPalette() called outside <CommandPaletteProvider>");
    }
    return { open: false, setOpen: () => {}, toggle: () => {} };
  }
  return ctx;
}

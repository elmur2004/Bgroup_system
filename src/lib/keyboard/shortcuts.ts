"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";

/**
 * Two-key sequence shortcut, like Linear's "g h" → home.
 * Returns whether the global cheat sheet is currently open and a setter.
 */
export function useGlobalShortcuts({
  setPaletteOpen,
  setCheatOpen,
}: {
  setPaletteOpen: (open: boolean) => void;
  setCheatOpen: (open: boolean) => void;
}) {
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const sequenceRef = useRef<{ key: string; at: number } | null>(null);

  useEffect(() => {
    function isTypingTarget(target: EventTarget | null): boolean {
      if (!(target instanceof HTMLElement)) return false;
      const tag = target.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
      if (target.isContentEditable) return true;
      return false;
    }

    function onKey(e: KeyboardEvent) {
      // Always-on global combos
      const isMod = e.metaKey || e.ctrlKey;
      if (isMod && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen(true);
        return;
      }

      // Don't capture single-key shortcuts while the user is typing.
      if (isTypingTarget(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;

      const k = e.key;

      // "?" — cheat sheet
      if (k === "?" || (e.shiftKey && k === "/")) {
        e.preventDefault();
        setCheatOpen(true);
        return;
      }

      // "/" — focus the palette search
      if (k === "/") {
        e.preventDefault();
        setPaletteOpen(true);
        return;
      }

      // Theme toggle
      if (k === "t") {
        e.preventDefault();
        setTheme(resolvedTheme === "dark" ? "light" : "dark");
        return;
      }

      // Two-key "g X" sequences
      const seq = sequenceRef.current;
      const now = Date.now();
      if (seq && seq.key === "g" && now - seq.at < 1500) {
        sequenceRef.current = null;
        const handled = (() => {
          switch (k) {
            case "h":
              router.push("/today");
              return true;
            case "e":
              router.push("/hr/employees");
              return true;
            case "o":
              router.push("/crm/opportunities");
              return true;
            case "d":
              router.push("/partners/deals");
              return true;
            case "p":
              router.push("/hr/payroll/monthly");
              return true;
            case "n":
              router.push("/partners/notifications");
              return true;
          }
          return false;
        })();
        if (handled) {
          e.preventDefault();
          return;
        }
      }

      if (k === "g") {
        sequenceRef.current = { key: "g", at: now };
        // Don't prevent default — user may legitimately type "g" elsewhere.
      } else {
        sequenceRef.current = null;
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router, setPaletteOpen, setCheatOpen, setTheme, resolvedTheme]);
}

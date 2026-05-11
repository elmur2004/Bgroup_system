// Codemod: replace hardcoded neutral Tailwind colors (slate/gray) with theme
// tokens so dark mode renders correctly. Run from the super-app root:
//
//   node scripts/codemod-theme-tokens.mjs
//
// Idempotent. Skips files that have already been migrated.

import { readdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { join, extname } from "node:path";

const SCAN_DIRS = [
  "src/components/hr",
  "src/components/partners",
  "src/app/(dashboard)/hr",
  "src/app/(dashboard)/partners",
];

const EXTS = new Set([".tsx", ".ts", ".jsx", ".js"]);

// Order matters: longer/more-specific patterns first.
const REPLACEMENTS = [
  // Background surfaces
  [/\bbg-white\b/g, "bg-card"],
  [/\bbg-slate-50\/50\b/g, "bg-muted/30"],
  [/\bbg-slate-50\b/g, "bg-muted/50"],
  [/\bbg-slate-100\b/g, "bg-muted"],
  [/\bbg-gray-50\/50\b/g, "bg-muted/30"],
  [/\bbg-gray-50\b/g, "bg-muted/50"],
  [/\bbg-gray-100\b/g, "bg-muted"],
  // Borders
  [/\bborder-slate-100\b/g, "border-border/60"],
  [/\bborder-slate-200\b/g, "border-border"],
  [/\bborder-slate-300\b/g, "border-border"],
  [/\bborder-gray-100\b/g, "border-border/60"],
  [/\bborder-gray-200\b/g, "border-border"],
  [/\bborder-gray-300\b/g, "border-border"],
  // Strong/heading text
  [/\btext-slate-900\b/g, "text-foreground"],
  [/\btext-slate-800\b/g, "text-foreground"],
  [/\btext-gray-900\b/g, "text-foreground"],
  [/\btext-gray-800\b/g, "text-foreground"],
  // Body text — use the foreground but slightly muted via opacity? No — keep
  // body text bold for readability, fall to foreground.
  [/\btext-slate-700\b/g, "text-foreground"],
  [/\btext-gray-700\b/g, "text-foreground"],
  // Secondary text → muted-foreground
  [/\btext-slate-600\b/g, "text-muted-foreground"],
  [/\btext-slate-500\b/g, "text-muted-foreground"],
  [/\btext-slate-400\b/g, "text-muted-foreground"],
  [/\btext-gray-600\b/g, "text-muted-foreground"],
  [/\btext-gray-500\b/g, "text-muted-foreground"],
  [/\btext-gray-400\b/g, "text-muted-foreground"],
  // Faint
  [/\btext-slate-300\b/g, "text-muted-foreground/60"],
  [/\btext-gray-300\b/g, "text-muted-foreground/60"],
  // Hover states for table rows etc.
  [/\bhover:bg-slate-50\b/g, "hover:bg-muted/50"],
  [/\bhover:bg-slate-100\b/g, "hover:bg-muted"],
  [/\bhover:bg-gray-50\b/g, "hover:bg-muted/50"],
  [/\bhover:bg-gray-100\b/g, "hover:bg-muted"],
  [/\bhover:text-slate-700\b/g, "hover:text-foreground"],
  [/\bhover:text-slate-900\b/g, "hover:text-foreground"],
  [/\bhover:text-gray-700\b/g, "hover:text-foreground"],
  [/\bhover:text-gray-900\b/g, "hover:text-foreground"],
];

let filesScanned = 0;
let filesChanged = 0;
let totalReplacements = 0;

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      if (entry === "node_modules" || entry === ".next") continue;
      yield* walk(full);
    } else if (EXTS.has(extname(entry))) {
      yield full;
    }
  }
}

for (const root of SCAN_DIRS) {
  let exists;
  try {
    exists = statSync(root).isDirectory();
  } catch {
    exists = false;
  }
  if (!exists) {
    console.log(`  skip (missing): ${root}`);
    continue;
  }
  for (const file of walk(root)) {
    filesScanned++;
    const before = readFileSync(file, "utf8");
    let after = before;
    let changes = 0;
    for (const [pattern, replacement] of REPLACEMENTS) {
      const next = after.replace(pattern, () => {
        changes++;
        return replacement;
      });
      after = next;
    }
    if (changes > 0) {
      writeFileSync(file, after, "utf8");
      filesChanged++;
      totalReplacements += changes;
      console.log(`  ${file.replace(/\\/g, "/")} (${changes})`);
    }
  }
}

console.log("");
console.log(`Files scanned:  ${filesScanned}`);
console.log(`Files changed:  ${filesChanged}`);
console.log(`Replacements:   ${totalReplacements}`);

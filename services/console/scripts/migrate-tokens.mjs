import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../src");

// Ordered longest-first so that overlay/solid variants are consumed before
// their bare counterparts.
const RULES = [
  // --- overlay scrims (opacity variants first) ---
  ["bg-slate-900/40", "bg-overlay/40"],
  ["bg-slate-900/50", "bg-overlay/50"],

  // --- dark code surface ---
  ["bg-slate-900", "bg-code"],
  ["bg-slate-800", "bg-code-header"],
  ["border-slate-700", "border-code-border"],
  ["text-slate-100", "text-code-text"],
  ["text-slate-200", "text-code-hover"],
  ["text-slate-300", "text-code-muted"],
  ["text-slate-400", "text-code-dim"],
  ["text-slate-800", "text-foreground"],

  // --- queued (indigo) ---
  ["bg-indigo-600", "bg-queued-solid"],
  ["hover:bg-indigo-700", "hover:bg-queued-solid-hover"],

  // --- running (sky / blue) ---
  ["bg-sky-400", "bg-running-solid"],
  ["bg-sky-50", "bg-running-subtle"],
  ["border-sky-100", "border-running-border"],
  ["border-sky-200", "border-running-border"],
  ["text-sky-500", "text-running"],
  ["text-sky-600", "text-running"],
  ["text-sky-700", "text-running-strong"],
  ["bg-blue-50", "bg-running-subtle"],
  ["border-blue-200", "border-running-border"],
  ["text-blue-600", "text-running"],
  ["text-blue-700", "text-running-strong"],
  ["text-blue-800", "text-running-strong"],

  // --- pass (emerald) ---
  ["bg-emerald-500", "bg-pass-solid"],
  ["bg-emerald-50", "bg-pass-subtle"],
  ["border-emerald-100", "border-pass-border"],
  ["border-emerald-200", "border-pass-border"],
  ["text-emerald-400", "text-pass"],
  ["text-emerald-500", "text-pass"],
  ["text-emerald-600", "text-pass"],
  ["text-emerald-700", "text-pass-strong"],

  // --- fail (rose) ---
  ["bg-rose-500", "bg-fail-solid"],
  ["bg-rose-600", "bg-fail-solid"],
  ["hover:bg-rose-700", "hover:bg-fail-solid-hover"],
  ["bg-rose-50", "bg-fail-subtle"],
  ["border-rose-100", "border-fail-border"],
  ["border-rose-200", "border-fail-border"],
  ["text-rose-500", "text-fail"],
  ["text-rose-600", "text-fail"],
  ["text-rose-700", "text-fail"],
  ["text-rose-800", "text-fail-strong"],
  ["text-rose-900", "text-fail-strong"],
  ["ring-rose-500", "ring-fail"],

  // --- timeout (amber) ---
  ["bg-amber-400", "bg-timeout-solid"],
  ["bg-amber-600", "bg-timeout-solid"],
  ["hover:bg-amber-700", "hover:bg-timeout-solid-hover"],
  ["bg-amber-100", "bg-timeout-subtle"],
  ["bg-amber-50", "bg-timeout-subtle"],
  ["border-amber-100", "border-timeout-border"],
  ["border-amber-200", "border-timeout-border"],
  ["text-amber-500", "text-timeout"],
  ["text-amber-600", "text-timeout"],
  ["text-amber-700", "text-timeout"],
  ["text-amber-800", "text-timeout-strong"],
  ["text-amber-900", "text-timeout-strong"],

  // --- retry (yellow) ---
  ["bg-yellow-50", "bg-retry-subtle"],
  ["border-yellow-100", "border-retry-border"],
  ["text-yellow-600", "text-retry"],
  ["text-yellow-700", "text-retry"],

  // --- arbitrary font sizes ---
  ["text-[11px]", "text-micro"],
  ["text-[10px]", "text-2xs"],
  ["text-[13px]", "text-sm"],

  // --- layout / container dimensions ---
  ["w-[208px]", "w-sidebar"],
  ["max-w-[1600px]", "max-w-content"],
  ["min-w-[1200px]", "min-w-table-xl"],
  ["min-w-[1132px]", "min-w-table-lg"],
  ["w-[84px]", "w-col-3xs"],
  ["w-[118px]", "w-col-2xs"],
  ["w-[136px]", "w-col-xs"],
  ["w-[144px]", "w-col-sm"],
  ["w-[155px]", "w-col-md"],
  ["w-[170px]", "w-col-lg"],
  ["w-[180px]", "w-col-xl"],
  ["min-w-[170px]", "min-w-col-lg"],
  ["min-w-[180px]", "min-w-col-xl"],
  ["max-h-[85vh]", "max-h-overlay-panel"],
  ["max-h-[80vh]", "max-h-code-panel"],
];

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (fs.statSync(full).isDirectory()) {
      if (entry !== "node_modules") walk(full, out);
    } else if (/\.tsx?$/.test(entry) && entry !== "schema.d.ts") {
      out.push(full);
    }
  }
  return out;
}

const dryRun = process.argv.includes("--dry-run");
const counts = new Map();
let touched = 0;

for (const file of walk(SRC)) {
  const before = fs.readFileSync(file, "utf8");
  let after = before;

  for (const [from, to] of RULES) {
    const pattern = new RegExp(`(?<![\\w-])${from.replace(/[[\]/]/g, "\\$&")}(?![\\w-])`, "g");
    const hits = after.match(pattern);
    if (hits) {
      after = after.replace(pattern, to);
      counts.set(to, (counts.get(to) ?? 0) + hits.length);
    }
  }

  if (after !== before) {
    touched += 1;
    if (!dryRun) fs.writeFileSync(file, after);
  }
}

const rows = [...counts.entries()].sort((a, b) => b[1] - a[1]);
const total = rows.reduce((sum, [, n]) => sum + n, 0);
for (const [token, n] of rows) {
  console.log(`${String(n).padStart(4)}  ${token}`);
}
console.log(`\n${dryRun ? "[dry-run] " : ""}${total} replacements across ${touched} files`);

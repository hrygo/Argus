import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../src");

// The only files permitted to contain raw values: the token definitions
// themselves. Everything else must express styling through semantic tokens.
const ALLOWED_RAW_VALUE_FILES = new Set([
  path.join(SRC, "design-system/tokens/colors.ts"),
  path.join(SRC, "design-system/tokens.css"),
]);

const IGNORED_DIRS = new Set(["__tests__", "test"]);
const IGNORE_MARKER = "token-lint-ignore";

// Hex colors, excluding HTML numeric entities such as `&#123`.
const HEX_COLOR = /(?<!&)#([0-9a-fA-F]{3,8})\b/g;

// Raw Tailwind palette utilities, e.g. `bg-rose-50`, `text-slate-700`.
const PALETTE_PREFIX =
  "(?:text|bg|border|ring|outline|fill|stroke|from|via|to|divide|shadow|decoration|accent|caret)-";
const PALETTE_NAMES =
  "(?:rose|emerald|amber|sky|green|red|yellow|blue|gray|slate|zinc|neutral|stone|indigo|violet|purple|teal|cyan|orange|lime|fuchsia|pink)-";
const RAW_PALETTE = new RegExp(
  "(?:[a-z-]+:)*?" + PALETTE_PREFIX + PALETTE_NAMES + "\\d{2,3}\\b",
  "g",
);

// Any remaining Tailwind arbitrary value, e.g. `w-[145px]` or `has-[:checked]`.
// Structural uses (selectors, variant arguments) are legitimate but must be
// declared explicitly with IGNORE_MARKER on the line or the line above.
const ARBITRARY_VALUE = /(?:^|[\s"'`:])((?:[\w.-]+:)*[\w./&*()-]+-\[[^\]\s]+\])/g;

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (fs.statSync(full).isDirectory()) {
      if (!IGNORED_DIRS.has(entry)) walk(full, out);
    } else if (/\.(tsx|ts|css)$/.test(entry) && entry !== "schema.d.ts") {
      out.push(full);
    }
  }
  return out;
}

const violations = [];

for (const file of walk(SRC)) {
  if (ALLOWED_RAW_VALUE_FILES.has(file)) continue;

  const lines = fs.readFileSync(file, "utf8").split("\n");
  const rel = path.relative(SRC, file);

  lines.forEach((line, index) => {
    const prev = index > 0 ? lines[index - 1] : "";
    if (line.includes(IGNORE_MARKER) || prev.includes(IGNORE_MARKER)) return;

    const report = (rule, match) => {
      violations.push({ rel, line: index + 1, rule, match, text: line.trim() });
    };

    for (const m of line.matchAll(HEX_COLOR)) report("hardcoded hex color", m[0]);
    for (const m of line.matchAll(RAW_PALETTE)) report("raw palette utility", m[0]);
    for (const m of line.matchAll(ARBITRARY_VALUE)) report("arbitrary value", m[1]);
  });
}

if (violations.length > 0) {
  const byRule = violations.reduce(
    (acc, v) => ((acc[v.rule] = (acc[v.rule] ?? 0) + 1), acc),
    {},
  );
  console.error("Design Token Lint failed:\n");
  for (const v of violations) {
    console.error(`  ${v.rel}:${v.line}  [${v.rule}] ${v.match}`);
    console.error(`    ${v.text}`);
  }
  const summary = Object.entries(byRule)
    .map(([rule, n]) => `${rule} x${n}`)
    .join(", ");
  console.error(`\n${violations.length} violation(s): ${summary}`);
  console.error(
    [
      "",
      "Use semantic tokens from src/design-system/tokens/.",
      "If a raw value is genuinely unavoidable (structural selector, intrinsic grid),",
      `add an explicit \`// ${IGNORE_MARKER}: <reason>\` comment on the line or the line above.`,
    ].join("\n"),
  );
  process.exit(1);
}

console.log("Design Token Lint: all files use semantic tokens.");

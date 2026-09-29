import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../src");

// The only files permitted to contain raw values: the token definitions
// themselves. Everything else must express styling through semantic tokens.
const ALLOWED_RAW_VALUE_FILES = new Set([
  path.join(SRC, "design-system/tokens/colors.ts"),
  // Shadow definitions need `rgba(0, 0, 0, 0.1)` for their alpha channel.
  // The colour scale has no "black at 10% alpha" token, and inventing one
  // would put a shadow-only value into the palette that contrast assertions
  // then have to reason about.
  path.join(SRC, "design-system/tokens/elevation.ts"),
  path.join(SRC, "design-system/tokens.css"),
]);

const IGNORED_DIRS = new Set(["__tests__", "test"]);
const IGNORE_MARKER = "token-lint-ignore";

// Hex colors, excluding HTML numeric entities such as `&#123`.
const HEX_COLOR = /(?<!&)#([0-9a-fA-F]{3,8})\b/g;

// Functional colour notations. `HEX_COLOR` cannot see these, so `rgb(0 0 0 /
// .5)` and `hsl(210 40% 96%)` walk past a linter that documents them as
// rejected.
//
// `color-mix()` is included deliberately even though it can be handed tokens
// (`color-mix(in oklab, var(--argus-color-fail) 50%, white)`). It is the one
// function that can derive *any* colour from literals, and the console has no
// use for it: every surface it would produce is a token that does not exist
// yet, which means it also does not have a contrast assertion behind it. The
// IGNORE_MARKER escape hatch covers the day that changes.
const FUNCTIONAL_COLOR =
  /\b(?:rgb|rgba|hsl|hsla|hwb|lab|lch|oklab|oklch|color|color-mix)\(/g;

// Raw Tailwind palette utilities, e.g. `bg-rose-50`, `text-slate-700`.
const PALETTE_PREFIX =
  "(?:text|bg|border|ring|outline|fill|stroke|from|via|to|divide|shadow|decoration|accent|caret)-";
const PALETTE_NAMES =
  "(?:rose|emerald|amber|sky|green|red|yellow|blue|gray|slate|zinc|neutral|stone|indigo|violet|purple|teal|cyan|orange|lime|fuchsia|pink)-";
const RAW_PALETTE = new RegExp(
  "(?:[a-z-]+:)*?" + PALETTE_PREFIX + PALETTE_NAMES + "\\d{2,3}\\b",
  "g",
);

// Tailwind's `white` and `black` are palette entries too, and they are the
// easiest way to bypass a token system: there is no number to grep for, so
// `RAW_PALETTE` never sees them. The design system expresses both ends of the
// value range as `foreground-inverse` / a status token, so treat a literal
// `-white` / `-black` in a colour position the same as `bg-rose-500`.
const RAW_BLACK_WHITE = new RegExp(
  "(?:[a-z-]+:)*?" + PALETTE_PREFIX + "(?:white|black)\\b",
  "g",
);

// Any remaining Tailwind arbitrary value, e.g. `w-[145px]` or `has-[:checked]`.
// Structural uses (selectors, variant arguments) are legitimate but must be
// declared explicitly with IGNORE_MARKER on the line or the line above.
const ARBITRARY_VALUE = /(?:^|[\s"'`:])((?:[\w.-]+:)*[\w./&*()-]+-\[[^\]\s]+\])/g;

/**
 * Every rule the linter enforces, as [rule name, match] pairs found in one
 * line. Exported so the rules themselves can be tested: a regex that silently
 * stops matching is the one failure mode a passing linter cannot report.
 *
 * @param {string} line
 * @returns {{ rule: string, match: string }[]}
 */
export function scanLine(line) {
  const found = [];
  const collect = (rule, pattern, group = 0) => {
    for (const m of line.matchAll(pattern)) {
      found.push({ rule, match: m[group] });
    }
  };

  collect("hardcoded hex color", HEX_COLOR);
  collect("functional color notation", FUNCTIONAL_COLOR);
  collect("raw palette utility", RAW_PALETTE);
  collect("raw palette utility", RAW_BLACK_WHITE);
  collect("arbitrary value", ARBITRARY_VALUE, 1);

  return found;
}

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

function main() {
  const violations = [];

  for (const file of walk(SRC)) {
    if (ALLOWED_RAW_VALUE_FILES.has(file)) continue;

    const lines = fs.readFileSync(file, "utf8").split("\n");
    const rel = path.relative(SRC, file);

    lines.forEach((line, index) => {
      const prev = index > 0 ? lines[index - 1] : "";
      if (line.includes(IGNORE_MARKER) || prev.includes(IGNORE_MARKER)) return;

      for (const { rule, match } of scanLine(line)) {
        violations.push({ rel, line: index + 1, rule, match, text: line.trim() });
      }
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
}

// Only lint when invoked as a script. The test file imports `scanLine`, and
// running the walk on import would make the linter report (and exit) from
// inside a test run.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}

import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { shadows } from "../tokens/elevation";

// Vitest runs with the console package as its root, so this sits at a stable
// path relative to cwd. `import.meta.url` is not a file:// URL here.
const SRC = path.resolve(process.cwd(), "src");
const indexCss = readFileSync(path.resolve(SRC, "index.css"), "utf8");
const tokensCss = readFileSync(
  path.resolve(SRC, "design-system/tokens.css"),
  "utf8",
);

// Same two-layer shape as the colour tokens: `tokens.css` owns the value and
// `index.css` binds it into the Tailwind theme.
const tokenValues = new Map(
  [...tokensCss.matchAll(/--argus-shadow-([a-z0-9]+):\s*([^;]+);/g)].map((m) => [
    m[1],
    m[2].trim(),
  ]),
);

const themeBindings = new Map(
  [...indexCss.matchAll(/--shadow-([a-z0-9]+):\s*var\(--argus-shadow-([a-z0-9]+)\);/g)].map(
    (m) => [m[1], m[2]],
  ),
);

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry !== "__tests__" && entry !== "test") walk(full, out);
    } else if (/\.tsx?$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

const usedShadows = new Map<string, string[]>();
for (const file of walk(SRC)) {
  const text = readFileSync(file, "utf8");
  for (const match of text.matchAll(/(?<![\w-])shadow-([a-z0-9]+)/g)) {
    const step = match[1];
    const rel = path.relative(SRC, file);
    usedShadows.set(step, [...(usedShadows.get(step) ?? []), rel]);
  }
}

describe("elevation scale", () => {
  it("finds the shadow utilities the console actually uses", () => {
    expect(usedShadows.size).toBeGreaterThan(0);
  });

  it.each([...Object.entries(shadows)])(
    "binds --shadow-%s to its token",
    (step) => {
      // `none` is the absence of a shadow and needs no utility.
      if (step === "none") return;
      expect(
        themeBindings.get(step) === step,
        `--shadow-${step} is defined in elevation.ts but never bound in ` +
          `index.css, so \`shadow-${step}\` silently resolves to Tailwind's ` +
          `default instead of the Argus scale.`,
      ).toBe(true);
    },
  );

  it.each([...usedShadows.entries()])(
    "shadow-%s is a step the Argus scale defines",
    (step, files) => {
      // Tailwind ships shadow-2xl, which is `0 25px 50px -12px rgb(0 0 0 /
      // 0.25)`. Nothing in elevation.ts is that heavy, so reaching for it is
      // how an overlay ends up looking like a consumer app rather than the
      // "subtle, industrial" surface elevation.ts asks for.
      expect(
        Object.keys(shadows),
        `shadow-${step} is used in ${[...new Set(files)].join(", ")} but is ` +
          `not a step of the Argus elevation scale.`,
      ).toContain(step);
    },
  );

  it("carries the token value for every declared step", () => {
    for (const [step, value] of tokenValues) {
      expect(
        (shadows as Record<string, string>)[step],
        `tokens.css --argus-shadow-${step} should carry the value from ` +
          `elevation.shadows.${step}`,
      ).toBe(value);
    }
  });

  it("declares no shadow variable in tokens.css that no token owns", () => {
    const orphans = [...tokenValues.keys()].filter(
      (step) => !(step in shadows),
    );
    expect(
      orphans,
      `tokens.css declares shadows with no token behind them: ${orphans.join(", ")}`,
    ).toEqual([]);
  });

  it("declares no theme binding that no token owns", () => {
    const orphans = [...themeBindings.keys()].filter(
      (step) => !(step in shadows),
    );
    expect(
      orphans,
      `index.css binds shadows with no token behind them: ${orphans.join(", ")}`,
    ).toEqual([]);
  });
});

import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { columnWidths, layoutDimensions } from "../tokens/spacing";

// Vitest runs with the console package as its root, so these sit at stable
// paths relative to cwd. `import.meta.url` is not a file:// URL here.
const SRC = path.resolve(process.cwd(), "src");
const indexCss = readFileSync(path.resolve(SRC, "index.css"), "utf8");

const declaredContainers = new Set(
  [...indexCss.matchAll(/--container-([a-z0-9-]+)\s*:/g)].map((m) => m[1]),
);

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry !== "__tests__" && entry !== "test") walk(full, out);
    } else if (/\.tsx$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

// Width utilities whose right-hand side is a project container token. Tailwind
// ships its own `max-w-*` keywords (`max-w-md`, `max-w-prose`, `max-w-full`),
// so only names that read like the Argus scale are collected here.
const CONTAINER_WIDTH =
  /(?<![\w-])(?:[a-z]+:)*(max-w|min-w|w)-(sidebar|content|drawer|modal(?:-lg)?|col-[a-z0-9-]+|table-[a-z0-9-]+)\b/g;

const usedContainers = new Map<string, string[]>();
for (const file of walk(SRC)) {
  const text = readFileSync(file, "utf8");
  for (const match of text.matchAll(CONTAINER_WIDTH)) {
    const [, prefix, name] = match;
    const cls = `${prefix}-${name}`;
    const rel = path.relative(SRC, file);
    usedContainers.set(cls, [...(usedContainers.get(cls) ?? []), rel]);
  }
}

describe("container scale", () => {
  it("finds the width utilities the console actually uses", () => {
    // A silently-empty scan would make every assertion below vacuous.
    expect(usedContainers.size).toBeGreaterThan(5);
  });

  it.each([...usedContainers.entries()])(
    "%s resolves to a declared --container-* token",
    (cls, files) => {
      const name = cls.replace(/^(?:[a-z]+:)*(?:max-w|min-w|w)-/, "");
      expect(
        declaredContainers.has(name),
        `${cls} is used in ${[...new Set(files)].join(", ")} but ` +
          `--container-${name} is not declared in index.css. An undefined ` +
          `container utility emits no CSS at all, so the element silently ` +
          `loses its width constraint.`,
      ).toBe(true);
    },
  );

  it("declares every column width from the token scale", () => {
    for (const [step, value] of Object.entries(columnWidths)) {
      // The two widest steps are named `table-lg` / `table-xl` in CSS because
      // they size whole tables rather than a single column.
      const cssName = step === "2xl" ? "table-lg" : step === "3xl" ? "table-xl" : `col-${step}`;
      expect(declaredContainers.has(cssName), `--container-${cssName}`).toBe(true);
      expect(
        indexCss.includes(`--container-${cssName}: ${value};`),
        `--container-${cssName} should carry the ${value} value from columnWidths.${step}`,
      ).toBe(true);
    }
  });

  it("carries the overlay geometry tokens that modalMaxWidth and drawerWidth describe", () => {
    // Both existed in TypeScript for the lifetime of the design system without
    // ever reaching CSS, so every `max-w-*` a dialog asked for was a no-op.
    expect(indexCss).toContain(`--container-modal: ${layoutDimensions.modalMaxWidth};`);
    expect(indexCss).toContain(`--container-drawer: ${layoutDimensions.drawerWidth};`);
  });

  it("keeps the overlay height utility in step with the token", () => {
    // `max-h-overlay-panel` is declared as a bare `@utility` rather than a
    // theme key, so the 85vh is written out a second time. Nothing but this
    // assertion keeps the two copies together.
    expect(indexCss).toContain(
      `@utility max-h-overlay-panel {\n  max-height: ${layoutDimensions.overlayPanelMaxHeight};\n}`,
    );
  });

  it("has no --container-* token without a value in the token scale", () => {
    const orphans = [...declaredContainers].filter(
      (name) =>
        !/^col-|^table-/.test(name) &&
        name !== "sidebar" &&
        name !== "content" &&
        name !== "modal" &&
        name !== "modal-lg" &&
        name !== "drawer",
    );
    expect(
      orphans,
      `index.css declares containers with no token behind them: ${orphans.join(", ")}`,
    ).toEqual([]);
  });
});

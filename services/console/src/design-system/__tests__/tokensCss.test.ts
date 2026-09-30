import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { semanticColors, statusScale } from "../tokens/colors";
import { tokenCssVariables } from "../tokens/cssNames";

// Vitest runs with the console package as its root, so the stylesheet sits at
// a stable path relative to cwd. `import.meta.url` is not a file:// URL here.
const css = readFileSync(
  path.resolve(process.cwd(), "src/design-system/tokens.css"),
  "utf8",
);

const declared = new Map<string, string>();
for (const match of css.matchAll(
  /(--argus-color-[a-z0-9-]+):\s*(#[0-9a-fA-F]{3,8});/g,
)) {
  declared.set(match[1], match[2].toLowerCase());
}

const expected = tokenCssVariables();

describe("tokens.css mirrors the TypeScript tokens", () => {
  it("parses the stylesheet", () => {
    expect(declared.size).toBeGreaterThan(70);
  });

  it.each([...expected].map(([name, value]) => [name, value] as const))(
    "%s is declared with the token value",
    (name, value) => {
      expect(declared.get(name), `${name} is missing from tokens.css`).toBe(
        value.toLowerCase(),
      );
    },
  );

  it("declares no colour variable that no token owns", () => {
    const orphans = [...declared.keys()].filter((name) => !expected.has(name));
    expect(
      orphans,
      `tokens.css declares variables with no token behind them: ${orphans.join(", ")}`,
    ).toEqual([]);
  });

  it("maps every token to a unique variable name", () => {
    // `tokenCssVariables` returns a Map, so two tokens resolving to the same
    // variable name would silently collapse into one entry. Compare its size
    // against the raw token count to catch that.
    const tokenCount =
      Object.keys(semanticColors).length +
      Object.values(statusScale).reduce(
        (sum, roles) => sum + Object.keys(roles).length,
        0,
      );
    expect(expected.size).toBe(tokenCount);
  });
});

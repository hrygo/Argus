import { describe, it, expect } from "vitest";
// The linter is a plain .mjs CLI; its types live in scripts/lint-tokens.d.mts.
import { scanLine } from "../../../scripts/lint-tokens.mjs";

const rulesFor = (line: string) => scanLine(line).map((v) => v.rule);
const matchesFor = (line: string) => scanLine(line).map((v) => v.match);

describe("design token lint rules", () => {
  describe("raw palette utilities", () => {
    it.each([
      ["bg-rose-500"],
      ["text-slate-700"],
      ["hover:border-red-300"],
    ])("flags %s", (cls) => {
      expect(rulesFor(`className="${cls}"`)).toContain("raw palette utility");
    });

    // `white` and `black` are palette entries with no number in the name, so
    // the numeric pattern never sees them. They were the only way left to
    // bypass the token system.
    it.each([
      ["text-white"],
      ["bg-black"],
      ["bg-black/40"],
      ["hover:bg-black/60"],
      ["border-white"],
      ["fill-black"],
    ])("flags %s", (cls) => {
      expect(rulesFor(`className="${cls}"`)).toContain("raw palette utility");
    });

    it.each([
      ["text-foreground-inverse"],
      ["bg-primary"],
      ["border-border-strong"],
      ["bg-surface-muted"],
      // A token name that merely starts with the same letters must not match.
      ["text-whitespace-nowrap"],
      ["bg-blackboard"],
    ])("accepts %s", (cls) => {
      expect(rulesFor(`className="${cls}"`)).toEqual([]);
    });
  });

  describe("hardcoded hex colors", () => {
    it("flags a hex literal", () => {
      expect(rulesFor('style={{ color: "#ff0000" }}')).toContain(
        "hardcoded hex color",
      );
    });

    it("accepts a 3-digit hex literal too", () => {
      expect(matchesFor("color: #abc")).toEqual(["#abc"]);
    });

    // `&#123;` is an HTML numeric entity, not a colour.
    it("accepts an HTML numeric entity", () => {
      expect(rulesFor("&#123; &#x1F600;")).toEqual([]);
    });
  });

  describe("arbitrary values", () => {
    it("flags an arbitrary value and reports it without the leading space", () => {
      expect(matchesFor('className="w-[145px]"')).toEqual(["w-[145px]"]);
    });

    it("flags a variant-scoped arbitrary value", () => {
      expect(matchesFor("md:hover:w-[145px]")).toEqual(["md:hover:w-[145px]"]);
    });
  });

  it("reports every violation on a line, not just the first", () => {
    // Findings come back grouped by rule rather than by position in the line,
    // so compare them as a set: the point is completeness, not ordering.
    const found = scanLine('className="text-white bg-rose-500 w-[3px]"');
    expect(found).toHaveLength(3);
    expect(found).toEqual(
      expect.arrayContaining([
        { rule: "raw palette utility", match: "text-white" },
        { rule: "raw palette utility", match: "bg-rose-500" },
        { rule: "arbitrary value", match: "w-[3px]" },
      ]),
    );
  });

  it("finds nothing in a line written entirely with tokens", () => {
    expect(
      scanLine(
        'className="inline-block rounded-lg bg-primary px-4 text-foreground-inverse hover:bg-primary-hover"',
      ),
    ).toEqual([]);
  });
});

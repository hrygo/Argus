import { describe, it, expect } from "vitest";
import { semanticColors, statusScale } from "../tokens/colors";
import {
  WCAG,
  contrastRatio,
  contrastRequirements,
  relativeLuminance,
} from "../tokens/contrast";

const requirements = contrastRequirements(
  semanticColors as unknown as Record<string, string>,
  statusScale as unknown as Record<string, Record<string, string>>,
);

describe("WCAG 2.2 contrast conformance", () => {
  it("derives a non-trivial requirement set from the tokens", () => {
    expect(requirements.length).toBeGreaterThan(40);
  });

  it.each(requirements.map((r) => [r.description, r] as const))(
    "%s meets its threshold",
    (_description, requirement) => {
      const ratio = contrastRatio(requirement.foreground, requirement.background);
      expect(
        ratio,
        `${requirement.description}: ${requirement.foreground} on ${requirement.background} ` +
          `is ${ratio.toFixed(2)}:1, needs ${requirement.threshold}:1 (${requirement.criterion})`,
      ).toBeGreaterThanOrEqual(requirement.threshold);
    },
  );

  it("keeps every token role a parseable sRGB hex value", () => {
    const hex = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
    for (const [family, roles] of Object.entries(statusScale)) {
      for (const [role, value] of Object.entries(roles)) {
        expect(value, `${family}.${role}`).toMatch(hex);
      }
    }
  });

  it("computes luminance and ratio per the WCAG definition", () => {
    expect(relativeLuminance("#ffffff")).toBeCloseTo(1, 5);
    expect(relativeLuminance("#000000")).toBeCloseTo(0, 5);
    expect(contrastRatio("#ffffff", "#000000")).toBeCloseTo(21, 5);
    // Ratio is order-independent.
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(
      contrastRatio("#ffffff", "#000000"),
      10,
    );
  });

  it("declares the thresholds it enforces", () => {
    expect(WCAG.textAA).toBe(4.5);
    expect(WCAG.nonTextAA).toBe(3);
  });
});

import { describe, it, expect } from "vitest";
import { semanticColors, statusScale } from "../tokens/colors";
import { typography } from "../tokens/typography";
import { spacing, layoutDimensions, columnWidths } from "../tokens/spacing";
import { radii, shadows, zIndices } from "../tokens/elevation";

describe("Argus Design System Tokens", () => {
  it("defines all essential semantic colors for the control plane", () => {
    expect(semanticColors.canvas).toBeDefined();
    expect(semanticColors.surface).toBeDefined();
    expect(semanticColors.surfaceMuted).toBeDefined();
    expect(semanticColors.foreground).toBeDefined();
    expect(semanticColors.foregroundSecondary).toBeDefined();
    expect(semanticColors.border).toBeDefined();
    expect(semanticColors.borderStrong).toBeDefined();
    expect(semanticColors.primary).toBeDefined();
  });

  it("adheres to 4px spacing scale conventions", () => {
    expect(spacing[1]).toBe("0.25rem"); // 4px
    expect(spacing[2]).toBe("0.5rem");  // 8px
    expect(spacing[4]).toBe("1rem");    // 16px
  });

  it("defines enterprise layout dimensions", () => {
    expect(layoutDimensions.sidebarWidth).toBe("208px");
    expect(layoutDimensions.topHeaderHeight).toBe("56px");
  });

  it("defines consistent font stacks and hierarchy", () => {
    expect(typography.fonts.sans).toContain("Inter");
    expect(typography.fonts.mono).toContain("monospace");
    expect(typography.fontSizes.xs).toBe("0.75rem");
    expect(typography.fontSizes.base).toBe("1rem");
  });

  it("defines controlled elevations and border radii", () => {
    expect(radii.sm).toBe("0.25rem");
    expect(radii.md).toBe("0.375rem");
    expect(radii.lg).toBe("0.5rem");
    expect(shadows.xs).toBeDefined();
    expect(zIndices.modal).toBeGreaterThan(zIndices.header);
  });

  describe("execution status scale", () => {
    const families = [
      "queued",
      "running",
      "pass",
      "fail",
      "timeout",
      "retry",
      "cancelled",
    ] as const;
    const roles = [
      "subtle",
      "border",
      "text",
      "textStrong",
      "solid",
      "solidHover",
      "onSolid",
    ] as const;

    it.each(families)("exposes the full role set for %s", (family) => {
      for (const role of roles) {
        expect(statusScale[family][role]).toMatch(/^#[0-9a-fA-F]{6}$/);
      }
    });

    it("keeps each family visually distinct from the others", () => {
      const solidValues = families.map((family) => statusScale[family].solid);
      expect(new Set(solidValues).size).toBe(families.length);
    });
  });

  // Contrast conformance lives in `contrast.test.ts`, derived from the
  // specification in `tokens/contrast.ts`. It is deliberately not duplicated
  // here: two implementations of the same rule would drift.

  it("defines a named step for every in-console font size", () => {
    // 11px and 10px are load-bearing in the dense tables; they must be
    // reachable as tokens rather than arbitrary values.
    expect(typography.fontSizes.micro).toBe("0.6875rem");
    expect(typography.fontSizes["2xs"]).toBe("0.625rem");
  });

  it("does not redefine Tailwind's default text scale", () => {
    // The documented steps must equal what Tailwind actually renders.
    // If these drift, `@theme` must not redefine them either — otherwise
    // every existing `text-*` usage silently changes size.
    const tailwindDefaults: Record<string, string> = {
      xs: "0.75rem",
      sm: "0.875rem",
      base: "1rem",
      lg: "1.125rem",
      xl: "1.25rem",
      "2xl": "1.5rem",
    };
    for (const [step, value] of Object.entries(tailwindDefaults)) {
      expect(typography.fontSizes[step as keyof typeof typography.fontSizes]).toBe(value);
    }
  });

  it("defines shell and table layout dimensions as tokens", () => {
    expect(layoutDimensions.contentMaxWidth).toBe("1600px");
    expect(columnWidths["3xl"]).toBe("1200px");
    expect(columnWidths["2xl"]).toBe("1132px");
  });
});

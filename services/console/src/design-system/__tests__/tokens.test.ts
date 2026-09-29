import { describe, it, expect } from "vitest";
import { globalColors, semanticColors } from "../tokens/colors";
import { typography } from "../tokens/typography";
import { spacing, layoutDimensions } from "../tokens/spacing";
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

  it("defines domain-specific quality gate status colors", () => {
    expect(semanticColors.statusPass).toBe(globalColors.emerald[600]);
    expect(semanticColors.statusFail).toBe(globalColors.rose[600]);
    expect(semanticColors.statusWarn).toBe(globalColors.amber[600]);
    expect(semanticColors.statusInfo).toBe(globalColors.sky[600]);
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
    expect(typography.fontSizes.base).toBe("0.875rem");
  });

  it("defines controlled elevations and border radii", () => {
    expect(radii.sm).toBe("0.25rem");
    expect(radii.md).toBe("0.375rem");
    expect(radii.lg).toBe("0.5rem");
    expect(shadows.xs).toBeDefined();
    expect(zIndices.modal).toBeGreaterThan(zIndices.header);
  });
});

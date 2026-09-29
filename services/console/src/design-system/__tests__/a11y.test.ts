import { describe, it, expect } from "vitest";
import { WCAG_NON_CONTRAST, a11yRequirements } from "../tokens/a11y";

const requirements = a11yRequirements();

describe("WCAG 2.2 non-contrast token conformance", () => {
  it("derives a requirement set that covers every criterion it claims", () => {
    const criteria = new Set(requirements.map((r) => r.criterion));
    expect(criteria).toEqual(
      new Set(["SC 1.4.1", "SC 1.4.4", "SC 1.4.12", "SC 2.4.11", "SC 2.5.8"]),
    );
    expect(requirements.length).toBeGreaterThan(20);
  });

  it.each(requirements.map((r) => [r.description, r] as const))(
    "%s",
    (_description, requirement) => {
      expect(
        requirement.holds,
        `${requirement.criterion}: ${requirement.subject} must be ${requirement.expected}`,
      ).toBe(true);
    },
  );

  it("declares the thresholds it enforces", () => {
    expect(WCAG_NON_CONTRAST.focusRingMinWidthPx).toBe(2);
    expect(WCAG_NON_CONTRAST.targetSizeMinPx).toBe(24);
    expect(WCAG_NON_CONTRAST.minLineHeight).toBe(1.25);
  });
});

/**
 * Argus Design System — Non-Contrast Accessibility Specification
 *
 * `contrast.ts` owns the colour rules (SC 1.4.3 / 1.4.6 / 1.4.11). This
 * module owns the remaining WCAG 2.2 success criteria that a design-token
 * layer can actually decide, and that a component can therefore inherit
 * without extra code:
 *
 * - SC 1.4.1  Use of Color           — state is never carried by hue alone
 * - SC 1.4.4  Resize Text            — type steps scale with browser settings
 * - SC 1.4.12 Text Spacing          — line heights survive user overrides
 * - SC 2.4.11 Focus Appearance      — focus ring geometry
 * - SC 2.5.8  Target Size (Minimum) — interactive hit-area floor
 *
 * The rules are derived from the tokens rather than restated, so a token
 * change that breaks conformance fails `__tests__/a11y.test.ts` instead of
 * shipping. Criteria the token layer cannot govern (2.1.1 Keyboard, 4.1.2
 * Name/Role/Value) are component responsibilities and are enforced by the
 * component tests instead.
 */

import { statusScale } from "./colors";
import { focusRing, layoutDimensions, targetSize } from "./spacing";
import { typography } from "./typography";

export const WCAG_NON_CONTRAST = {
  /** SC 1.4.4 Resize Text, AA — nothing blocks zoom or text scaling. */
  resizeText: "rem",
  /** SC 1.4.12 Text Spacing, AA — line boxes must not clip user overrides. */
  minLineHeight: 1.25,
  /** SC 2.4.11 Focus Appearance, AA — indicator perimeter thickness. */
  focusRingMinWidthPx: 2,
  /** SC 2.5.8 Target Size (Minimum), AA — pointer target floor. */
  targetSizeMinPx: parseInt(targetSize.minimum, 10),
} as const;

export interface A11yRequirement {
  description: string;
  criterion: string;
  /** The token value under test, carried so a failure explains itself. */
  subject: string;
  expected: string;
  holds: boolean;
}

const px = (value: string): number => parseFloat(value);

/**
 * Steps that exist only to match Tailwind's shipped scale and are never used
 * for running text. They are recorded in `typography.ts` for documentation
 * and are not redefined in `@theme`, so nothing in the console inherits them.
 */
const DISPLAY_ONLY_LINE_HEIGHTS = new Set(["none"]);

/**
 * Builds the full requirement list from the live tokens.
 *
 * Each entry carries its own pass/fail so a single `it.each` can report the
 * exact criterion, token and value that broke, rather than one aggregate
 * boolean.
 */
export const a11yRequirements = (): A11yRequirement[] => {
  const requirements: A11yRequirement[] = [];
  const add = (
    description: string,
    criterion: string,
    subject: string,
    expected: string,
    holds: boolean,
  ) => requirements.push({ description, criterion, subject, expected, holds });

  // SC 1.4.4 Resize Text — a px-locked step stops growing with the browser's
  // default font size, which is exactly what the criterion forbids.
  for (const [step, value] of Object.entries(typography.fontSizes)) {
    add(
      `type step "${step}" scales with browser text size`,
      "SC 1.4.4",
      `${step}: ${value}`,
      WCAG_NON_CONTRAST.resizeText,
      value.endsWith(WCAG_NON_CONTRAST.resizeText),
    );
  }

  // SC 1.4.12 Text Spacing — browsers push line-height to 1.5x when the user
  // overrides spacing; a tighter authored line-height clips descenders.
  for (const [step, value] of Object.entries(typography.lineHeights)) {
    if (DISPLAY_ONLY_LINE_HEIGHTS.has(step)) continue;
    add(
      `line height "${step}" survives user spacing overrides`,
      "SC 1.4.12",
      `${step}: ${value}`,
      `>= ${WCAG_NON_CONTRAST.minLineHeight}`,
      Number(value) >= WCAG_NON_CONTRAST.minLineHeight,
    );
  }

  // SC 2.4.11 Focus Appearance — geometry half. The colour half lives in
  // `contrast.ts` so all contrast rules stay in one place.
  add(
    "focus ring is at least 2 CSS px thick",
    "SC 2.4.11",
    `focusRing.width: ${focusRing.width}`,
    `>= ${WCAG_NON_CONTRAST.focusRingMinWidthPx}px`,
    px(focusRing.width) >= WCAG_NON_CONTRAST.focusRingMinWidthPx,
  );
  add(
    "focus ring is offset from the control so it is not clipped",
    "SC 2.4.11",
    `focusRing.offset: ${focusRing.offset}`,
    "> 0px",
    px(focusRing.offset) > 0,
  );

  // SC 2.5.8 Target Size (Minimum) — every interactive row and control in
  // the console clears the 24 CSS px floor.
  for (const [key, value] of Object.entries(layoutDimensions)) {
    if (!/Height$/.test(key) || key === "topHeaderHeight") continue;
    add(
      `"${key}" clears the pointer target floor`,
      "SC 2.5.8",
      `${key}: ${value}`,
      `>= ${WCAG_NON_CONTRAST.targetSizeMinPx}px`,
      px(value) >= WCAG_NON_CONTRAST.targetSizeMinPx,
    );
  }

  // SC 1.4.1 Use of Color — if two states shared a text colour the only
  // remaining difference would be the tint behind it, which does not survive
  // greyscale, print or colour-vision differences.
  const textColours = Object.entries(statusScale).map(
    ([family, roles]) => [family, roles.text] as const,
  );
  for (const [family, colour] of textColours) {
    const clashes = textColours.filter(([, other]) => other === colour);
    add(
      `"${family}" is distinguishable without colour`,
      "SC 1.4.1",
      `${family}.text: ${colour}`,
      "unique across the status scale",
      clashes.length === 1,
    );
  }

  return requirements;
};

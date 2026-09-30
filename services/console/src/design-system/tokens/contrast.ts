/**
 * Argus Design System — Contrast Specification
 *
 * This module is the normative source for colour accessibility in the console.
 * Every threshold below is a WCAG 2.2 success criterion. The pair list is
 * derived from the tokens themselves and verified by
 * `__tests__/contrast.test.ts`, so a token change that breaks conformance
 * fails the build instead of shipping.
 *
 * There is deliberately no separate `fill` role. SC 1.4.3 (4.5:1 for the label
 * on `onSolid`) and SC 1.4.11 (3:1 for the mark against `surface`) converge on
 * the same shade, so one `solid` role serves both the meter segment and the
 * text-bearing surface. Splitting them is what previously put white text on
 * an amber-400 button at 1.94:1.
 */

export const WCAG = {
  /** SC 1.4.3 Contrast (Minimum), AA — normal-size text. */
  textAA: 4.5,
  /** SC 1.4.6 Contrast (Enhanced), AAA — tracked for headroom, not required. */
  textAAA: 7,
  /** SC 1.4.11 Non-text Contrast, AA — UI components and meaningful graphics. */
  nonTextAA: 3,
} as const;

const normalize = (hex: string): string => {
  const value = hex.replace("#", "").trim();
  return value.length === 3
    ? value
        .split("")
        .map((c) => c + c)
        .join("")
    : value;
};

/** WCAG 2.x relative luminance. */
export const relativeLuminance = (hex: string): number => {
  const value = normalize(hex);
  const channel = (offset: number): number => {
    const raw = parseInt(value.slice(offset, offset + 2), 16) / 255;
    return raw <= 0.03928 ? raw / 12.92 : ((raw + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(0) + 0.7152 * channel(2) + 0.0722 * channel(4);
};

/** WCAG 2.x contrast ratio; order-independent. */
export const contrastRatio = (a: string, b: string): number => {
  const [lighter, darker] = [relativeLuminance(a), relativeLuminance(b)].sort(
    (x, y) => y - x,
  ) as [number, number];
  return (lighter + 0.05) / (darker + 0.05);
};

export interface ContrastRequirement {
  /** What the pair is, in product terms. */
  description: string;
  foreground: string;
  background: string;
  threshold: number;
  /** Success-criterion reference, recorded so a failure explains itself. */
  criterion: string;
}

/**
 * Every pair the console actually renders, derived from the live tokens.
 *
 * One deliberate exclusion:
 *
 * - Status `border` is decorative. The state is already carried by `text` on
 *   `subtle`, which is held to 4.5:1, so SC 1.4.11 does not apply.
 */
export const contrastRequirements = (
  semantic: Record<string, string>,
  scale: Record<string, Record<string, string>>,
): ContrastRequirement[] => {
  const requirements: ContrastRequirement[] = [];
  const add = (
    description: string,
    foreground: string,
    background: string,
    threshold: number,
    criterion: string,
  ) => requirements.push({ description, foreground, background, threshold, criterion });

  const surfaces = ["canvas", "surface", "surfaceMuted"] as const;
  for (const surface of surfaces) {
    add(`body text on ${surface}`, semantic.foreground, semantic[surface], WCAG.textAA, "SC 1.4.3");
    add(
      `secondary text on ${surface}`,
      semantic.foregroundSecondary,
      semantic[surface],
      WCAG.textAA,
      "SC 1.4.3",
    );
    add(`muted text on ${surface}`, semantic.foregroundMuted, semantic[surface], WCAG.textAA, "SC 1.4.3");
  }

  add("brand text on surface", semantic.primary, semantic.surface, WCAG.textAA, "SC 1.4.3");
  add(
    "brand text on brand subtle",
    semantic.primary,
    semantic.primarySubtle,
    WCAG.textAA,
    "SC 1.4.3",
  );
  add("inverse text on brand", semantic.foregroundInverse, semantic.primary, WCAG.textAA, "SC 1.4.3");

  add("code text on code surface", semantic.codeText, semantic.codeSurface, WCAG.textAA, "SC 1.4.3");
  add("code muted on code header", semantic.codeTextMuted, semantic.codeHeader, WCAG.textAA, "SC 1.4.3");
  add("code dim on code header", semantic.codeTextDim, semantic.codeHeader, WCAG.textAA, "SC 1.4.3");
  add("code hover on code header", semantic.codeTextHover, semantic.codeHeader, WCAG.textAA, "SC 1.4.3");

  // SC 1.4.11 — control boundaries and focus indication.
  add(
    "control border on surface",
    semantic.borderStrong,
    semantic.surface,
    WCAG.nonTextAA,
    "SC 1.4.11",
  );
  add(
    "control border on canvas",
    semantic.borderStrong,
    semantic.canvas,
    WCAG.nonTextAA,
    "SC 1.4.11",
  );
  add("focus ring on surface", semantic.focus, semantic.surface, WCAG.nonTextAA, "SC 1.4.11");
  add("focus ring on canvas", semantic.focus, semantic.canvas, WCAG.nonTextAA, "SC 1.4.11");

  for (const [family, roles] of Object.entries(scale)) {
    add(`${family} label on its tint`, roles.text, roles.subtle, WCAG.textAA, "SC 1.4.3");
    add(
      `${family} emphasis on its tint`,
      roles.textStrong,
      roles.subtle,
      WCAG.textAA,
      "SC 1.4.3",
    );
    add(
      `${family} label on its solid`,
      roles.onSolid,
      roles.solid,
      WCAG.textAA,
      "SC 1.4.3",
    );
    add(
      `${family} label on its hovered solid`,
      roles.onSolid,
      roles.solidHover,
      WCAG.textAA,
      "SC 1.4.3",
    );
    add(
      `${family} solid as a meaningful graphic on surface`,
      roles.solid,
      semantic.surface,
      WCAG.nonTextAA,
      "SC 1.4.11",
    );
  }

  return requirements;
};

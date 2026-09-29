/**
 * Argus Design System — CSS Variable Naming Contract
 *
 * `tokens.css` is consumed by Tailwind v4 through `@theme`, so it cannot be
 * generated from `colors.ts` at build time. That leaves two places that can
 * drift: the token value and the variable *name*.
 *
 * This module closes the second gap. It is the single place that decides
 * which `--argus-color-*` variable backs a token, and
 * `__tests__/tokensCss.test.ts` asserts the mapping in both directions:
 * every token resolves to a declared variable with the same value, and
 * every declared variable is claimed by exactly one token.
 *
 * Default rule: plain kebab-case of the token key
 * (`borderStrong` -> `--argus-color-border-strong`).
 */

import { type StatusRole, semanticColors, statusScale } from "./colors";

/**
 * Semantic tokens whose CSS variable intentionally keeps the vocabulary that
 * Tailwind/shadcn users expect from `text-muted-foreground` and friends, so
 * the utility classes stay idiomatic.
 */
const SEMANTIC_NAME_OVERRIDES: Partial<Record<keyof typeof semanticColors, string>> = {
  foregroundMuted: "muted-foreground",
  primaryActive: "primary-strong",
  codeTextMuted: "code-muted",
  codeTextDim: "code-dim",
  codeTextHover: "code-hover",
};

/**
 * Status role overrides.
 *
 * `text` and `textStrong` drop the infix so that the utility classes read
 * `text-fail` / `text-fail-strong` rather than `text-fail-text`.
 */
const ROLE_NAME_OVERRIDES: Partial<Record<StatusRole, string>> = {
  text: "",
  textStrong: "strong",
};

const kebab = (value: string): string =>
  value.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();

const variable = (name: string): string => `--argus-color-${name}`;

export const semanticCssVariable = (key: keyof typeof semanticColors): string =>
  variable(SEMANTIC_NAME_OVERRIDES[key] ?? kebab(key));

export const statusCssVariable = (
  family: keyof typeof statusScale,
  role: StatusRole,
): string => {
  const suffix = ROLE_NAME_OVERRIDES[role] ?? kebab(role);
  return variable(suffix ? `${family}-${suffix}` : family);
};

/** Every CSS variable the token layer owns, with its authoritative value. */
export const tokenCssVariables = (): Map<string, string> => {
  const all = new Map<string, string>();
  for (const [key, value] of Object.entries(semanticColors)) {
    all.set(semanticCssVariable(key as keyof typeof semanticColors), value);
  }
  for (const [family, roles] of Object.entries(statusScale)) {
    for (const [role, value] of Object.entries(roles)) {
      all.set(
        statusCssVariable(family as keyof typeof statusScale, role as StatusRole),
        value,
      );
    }
  }
  return all;
};

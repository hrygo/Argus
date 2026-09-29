/**
 * Argus Design System - Typography Tokens
 */

export const typography = {
  fonts: {
    sans: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    mono: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
  },
  fontSizes: {
    "2xs": "0.625rem", // 10px - Badges, tiny captions
    xs: "0.75rem",    // 12px - Table dense content, metadata
    sm: "0.8125rem",  // 13px - Standard controls, secondary text
    base: "0.875rem", // 14px - Primary body, default button text
    md: "1rem",       // 16px - Emphasized body, card titles
    lg: "1.125rem",   // 18px - Section headers, page titles
    xl: "1.25rem",    // 20px - Main titles
    "2xl": "1.5rem",  // 24px - Large headlines
  },
  lineHeights: {
    none: "1",
    tight: "1.25",
    snug: "1.375",
    normal: "1.5",
    relaxed: "1.625",
  },
  fontWeights: {
    normal: "400",
    medium: "500",
    semibold: "600",
    bold: "700",
  },
  letterSpacings: {
    tighter: "-0.04em",
    tight: "-0.02em",
    normal: "0em",
    wide: "0.025em",
    wider: "0.05em",
  },
} as const;

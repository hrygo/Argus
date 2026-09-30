/**
 * Argus Design System - Spacing & Sizing Tokens
 * 4px linear scale for dense enterprise control planes
 */

export const spacing = {
  px: "1px",
  0: "0",
  0.5: "0.125rem", // 2px
  1: "0.25rem",    // 4px
  1.5: "0.375rem", // 6px
  2: "0.5rem",     // 8px
  2.5: "0.625rem", // 10px
  3: "0.75rem",    // 12px
  3.5: "0.875rem", // 14px
  4: "1rem",       // 16px
  5: "1.25rem",    // 20px
  6: "1.5rem",     // 24px
  8: "2rem",       // 32px
  10: "2.5rem",    // 40px
  12: "3rem",      // 48px
  16: "4rem",      // 64px
} as const;

export const layoutDimensions = {
  sidebarWidth: "208px",
  topHeaderHeight: "56px",
  contentMaxWidth: "1600px",
  tableRowHeightDense: "36px",
  tableRowHeightNormal: "44px",
  controlHeightSm: "32px",
  controlHeightMd: "36px",
  modalMaxWidth: "560px",
  /**
   * Dialogs that host a form rather than a confirmation. The default 560px
   * fits a message and a pair of buttons; a form dialog needs room for a
   * four-across row of numeric fields without stretching a two-digit input to
   * 280px.
   */
  modalMaxWidthLg: "720px",
  drawerWidth: "480px",
  overlayPanelMaxHeight: "85vh",
} as const;

/**
 * Focus indication geometry — WCAG 2.2 SC 2.4.11 Focus Appearance (AA).
 *
 * The criterion asks for a perimeter at least 2 CSS px thick with a 3:1
 * contrast against what surrounds it. `focusRing.color` is checked for
 * contrast in `contrast.ts`; the two values here cover the geometry half.
 */
export const focusRing = {
  width: "2px",
  offset: "2px",
} as const;

/**
 * Interactive target floor — WCAG 2.2 SC 2.5.8 Target Size (Minimum), AA.
 *
 * Every control height in `layoutDimensions` is asserted against this value
 * by `__tests__/a11y.test.ts`, so a denser table or a tighter button cannot
 * quietly drop below the 24 CSS px floor.
 */
export const targetSize = {
  minimum: "24px",
} as const;

/**
 * Table column width scale
 *
 * High-density Launch and Agent tables need stable, shared column widths
 * so that rows stay aligned and never reflow between views. These are
 * expressed as named steps rather than per-table arbitrary values.
 */
export const columnWidths = {
  "3xs": "84px",
  "2xs": "118px",
  xs: "136px",
  sm: "144px",
  md: "155px",
  lg: "170px",
  xl: "180px",
  "2xl": "1132px",
  "3xl": "1200px",
} as const;

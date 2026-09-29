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
  tableRowHeightDense: "36px",
  tableRowHeightNormal: "44px",
  controlHeightSm: "32px",
  controlHeightMd: "36px",
  modalMaxWidth: "560px",
  drawerWidth: "480px",
} as const;

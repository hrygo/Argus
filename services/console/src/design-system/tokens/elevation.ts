/**
 * Argus Design System - Radii, Shadow & Elevation Tokens
 * Subtle, industrial look for enterprise control plane
 */

export const radii = {
  none: "0",
  xs: "0.125rem", // 2px
  sm: "0.25rem",  // 4px - Badges, tiny tags
  md: "0.375rem", // 6px - Controls, buttons, inputs
  lg: "0.5rem",   // 8px - Panels, cards, tables
  xl: "0.75rem",  // 12px - Dialogs, modals
  full: "9999px",
} as const;

export const shadows = {
  none: "none",
  xs: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
  sm: "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)",
  md: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)",
  lg: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)",
} as const;

export const zIndices = {
  base: 0,
  dropdown: 10,
  header: 20,
  sticky: 30,
  drawer: 40,
  modal: 50,
  popover: 60,
  toast: 70,
} as const;

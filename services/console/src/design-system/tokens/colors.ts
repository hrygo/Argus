/**
 * Argus Design System - Color Tokens
 *
 * Three-tier token architecture:
 * 1. Global Primitives (Neutral Slate, Brand Indigo, Status Palettes)
 * 2. Semantic Tokens (Surfaces, Foregrounds, Borders, Gate & Quality States)
 */

export const globalColors = {
  // Brand Indigo / Iris (Rigorous, engineering-focused control plane)
  indigo: {
    50: "#f1f0ff",
    100: "#e0dfff",
    200: "#d9d7ff",
    300: "#b6b3ff",
    400: "#8c88f9",
    500: "#5957c8",
    600: "#4947b7",
    700: "#403e9f",
    800: "#343282",
    900: "#2a2968",
  },
  // Neutral Slate (Carefully tuned for high-density tabular and code data)
  slate: {
    50: "#f8fafc",
    100: "#f1f5f9",
    200: "#e2e8f0",
    300: "#cbd5e1",
    400: "#94a3b8",
    500: "#64748b",
    600: "#475569",
    700: "#334155",
    800: "#1e293b",
    900: "#0f172a",
  },
  // Status / Gate: Success (Gate Passed, Success Run)
  emerald: {
    50: "#ecfdf5",
    100: "#d1fae5",
    200: "#a7f3d0",
    500: "#10b981",
    600: "#059669",
    700: "#047857",
    800: "#065f46",
  },
  // Status / Gate: Danger (Gate Rejected, Failure, Severe Error)
  rose: {
    50: "#fff1f2",
    100: "#ffe4e6",
    200: "#fecdd3",
    500: "#f43f5e",
    600: "#e11d48",
    700: "#be123c",
    800: "#9f1239",
  },
  // Status / Gate: Warning (Degraded, Warning, Retry In Progress)
  amber: {
    50: "#fffbeb",
    100: "#fef3c7",
    200: "#fde68a",
    500: "#f59e0b",
    600: "#d97706",
    700: "#b45309",
    800: "#92400e",
  },
  // Status / Gate: Info (Running, Orchestrating, In Progress)
  sky: {
    50: "#f0f9ff",
    100: "#e0f2fe",
    200: "#bae6fd",
    500: "#0ea5e9",
    600: "#0284c7",
    700: "#0369a1",
    800: "#075985",
  },
} as const;

export const semanticColors = {
  // Application Shell & Backgrounds
  canvas: "#f6f7f9",
  surface: "#ffffff",
  surfaceMuted: "#f3f4f6",
  surfaceRaised: "#ffffff",
  surfaceOverlay: "#ffffff",

  // Typography & Foregrounds
  foreground: "#171923",
  foregroundSecondary: "#4b5563",
  foregroundMuted: "#686d78",
  foregroundInverse: "#ffffff",

  // Borders & Dividers
  border: "#e5e7eb",
  borderStrong: "#d1d5db",
  borderSubtle: "#f3f4f6",

  // Brand Primary Interaction
  primary: globalColors.indigo[500],
  primaryHover: globalColors.indigo[600],
  primaryActive: globalColors.indigo[700],
  primarySubtle: globalColors.indigo[50],
  primaryBorder: globalColors.indigo[200],
  focus: globalColors.indigo[500],

  // Quality & Gate Semantics (Domain specific to Argus)
  statusPass: globalColors.emerald[600],
  statusPassSubtle: globalColors.emerald[50],
  statusPassBorder: globalColors.emerald[200],
  statusFail: globalColors.rose[600],
  statusFailSubtle: globalColors.rose[50],
  statusFailBorder: globalColors.rose[200],
  statusWarn: globalColors.amber[600],
  statusWarnSubtle: globalColors.amber[50],
  statusWarnBorder: globalColors.amber[200],
  statusInfo: globalColors.sky[600],
  statusInfoSubtle: globalColors.sky[50],
  statusInfoBorder: globalColors.sky[200],
} as const;

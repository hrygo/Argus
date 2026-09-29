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
    400: "#fbbf24",
    500: "#f59e0b",
    600: "#d97706",
    700: "#b45309",
    800: "#92400e",
    900: "#78350f",
  },
  // Status / Gate: Info (Running, Orchestrating, In Progress)
  sky: {
    50: "#f0f9ff",
    100: "#e0f2fe",
    200: "#bae6fd",
    400: "#38bdf8",
    500: "#0ea5e9",
    600: "#0284c7",
    700: "#0369a1",
    800: "#075985",
  },
  // Status / Gate: Retry (Waiting for retry, backoff scheduled)
  yellow: {
    50: "#fefce8",
    100: "#fef9c3",
    200: "#fef08a",
    400: "#facc15",
    500: "#eab308",
    600: "#ca8a04",
    700: "#a16207",
    800: "#854d0e",
    900: "#713f12",
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

  // Overlays & Scrim (Modal / Drawer backdrop)
  overlay: globalColors.slate[900],

  // Dark Code Surface (JSON viewer, code blocks)
  codeSurface: globalColors.slate[900],
  codeHeader: globalColors.slate[800],
  codeBorder: globalColors.slate[700],
  codeText: globalColors.slate[100],
  codeTextMuted: globalColors.slate[300],
  codeTextDim: globalColors.slate[400],
  codeTextHover: globalColors.slate[200],
} as const;

/**
 * Execution Status Scale
 *
 * Argus models Launch Item execution outcomes on a seven-step scale.
 * Each family exposes a fixed set of roles so that any state can be
 * rendered consistently across badges, progress meters, tables and
 * callouts without reaching for a raw palette.
 */
export const statusScale = {
  queued: {
    subtle: globalColors.indigo[50],
    border: globalColors.indigo[200],
    text: globalColors.indigo[700],
    textStrong: globalColors.indigo[800],
    solid: globalColors.indigo[500],
    solidHover: globalColors.indigo[600],
    onSolid: "#ffffff",
  },
  running: {
    subtle: globalColors.sky[50],
    border: globalColors.sky[200],
    text: globalColors.sky[700],
    textStrong: globalColors.sky[800],
    solid: globalColors.sky[400],
    solidHover: globalColors.sky[600],
    onSolid: "#ffffff",
  },
  pass: {
    subtle: globalColors.emerald[50],
    border: globalColors.emerald[200],
    text: globalColors.emerald[700],
    textStrong: globalColors.emerald[800],
    solid: globalColors.emerald[500],
    solidHover: globalColors.emerald[600],
    onSolid: "#ffffff",
  },
  fail: {
    subtle: globalColors.rose[50],
    border: globalColors.rose[200],
    text: globalColors.rose[700],
    textStrong: globalColors.rose[800],
    solid: globalColors.rose[500],
    solidHover: globalColors.rose[700],
    onSolid: "#ffffff",
  },
  timeout: {
    subtle: globalColors.amber[50],
    border: globalColors.amber[200],
    text: globalColors.amber[700],
    textStrong: globalColors.amber[800],
    solid: globalColors.amber[400],
    solidHover: globalColors.amber[600],
    onSolid: globalColors.amber[900],
  },
  retry: {
    subtle: globalColors.yellow[50],
    border: globalColors.yellow[200],
    text: globalColors.yellow[700],
    textStrong: globalColors.yellow[800],
    solid: globalColors.yellow[400],
    solidHover: globalColors.yellow[600],
    onSolid: globalColors.yellow[900],
  },
  cancelled: {
    subtle: semanticColors.surfaceMuted,
    border: semanticColors.border,
    text: globalColors.slate[700],
    textStrong: globalColors.slate[900],
    solid: globalColors.slate[400],
    solidHover: globalColors.slate[500],
    onSolid: "#ffffff",
  },
} as const;

export type StatusFamily = keyof typeof statusScale;
export type StatusRole = keyof (typeof statusScale)["pass"];

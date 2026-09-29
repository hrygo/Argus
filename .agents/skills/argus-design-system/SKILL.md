---
name: argus-design-system
description: "Argus Console design token conventions, UI guidelines, and styling guardrails. MUST be followed when modifying or adding UI components in services/console."
---

# Argus Console Design System & Token Guidelines

This skill enforces strict adherence to the Argus Design System for all frontend development in `services/console`.

## 1. Single Source of Truth (SSOT)

All design tokens are defined in `services/console/src/design-system/tokens/` and exported via `tokens.css`:
- **Colors**: `src/design-system/tokens/colors.ts` (Global & Semantic status colors)
- **Typography**: `src/design-system/tokens/typography.ts` (Font stacks, scales, line heights)
- **Spacing & Sizing**: `src/design-system/tokens/spacing.ts` (4px linear scale & layout dimensions)
- **Elevation**: `src/design-system/tokens/elevation.ts` (Radii, shadows, z-indices)

## 2. Strict Rules & Guardrails

- ❌ **NO Hardcoded Hex Colors**: Never use `#ffffff`, `#171923`, or any arbitrary hex code in `.tsx`, `.ts`, or `.css` files.
- ❌ **NO Arbitrary Tailwind Value Brackets**: Never use arbitrary color classes like `bg-[#f00]`, `text-[#123456]`, or `border-[#e2e8f0]`.
- ❌ **NO Inventing Ad-hoc Status Colors**:
  - For **Pass / Gate Passed / Success**: use `text-status-pass`, `bg-status-pass-subtle`, `border-status-pass-border` (or `Badge tone="success"`).
  - For **Fail / Gate Rejected / Danger**: use `text-status-fail`, `bg-status-fail-subtle`, `border-status-fail-border` (or `Badge tone="danger"`).
  - For **Warning / Degraded / Retrying**: use `text-status-warn`, `bg-status-warn-subtle`, `border-status-warn-border` (or `Badge tone="warning"`).
  - For **Running / Orchestrating / Info**: use `text-status-info`, `bg-status-info-subtle`, `border-status-info-border` (or `Badge tone="info"`).

## 3. Recommended Patterns

- **Panels & Containers**: Use `<Panel className="p-5 shadow-xs">` or `.ui-panel`.
- **Buttons**: Use `<Button variant="primary | secondary | danger | warning | quiet">` or `.ui-button`.
- **Badges**: Use `<Badge tone="neutral | info | success | warning | danger">` or `.ui-badge`.
- **Forms & Inputs**: Use `<TextInput>`, `<SelectInput>`, `<TextArea>` from `components/ui/Primitives.tsx` or `.ui-control`.
- **Verification**: Run `pnpm --dir services/console lint:tokens` to ensure compliance before committing.

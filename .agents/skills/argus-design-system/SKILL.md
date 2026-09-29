---
name: argus-design-system
description: "Argus Console design token conventions, UI guidelines, and styling guardrails. MUST be followed when modifying or adding UI components in services/console."
---

# Argus Console Design System

Styling in `services/console` MUST be expressed through the semantic tokens
defined in `src/design-system/`. Raw values are not a style option.

## Single Source of Truth

```text
src/design-system/tokens/colors.ts       Global palettes + semantic + statusScale
src/design-system/tokens/contrast.ts     WCAG colour thresholds + requirement list
src/design-system/tokens/a11y.ts         WCAG non-contrast thresholds + requirement list
src/design-system/tokens/cssNames.ts     TS token -> CSS variable naming contract
src/design-system/tokens/typography.ts   Font stacks and the type scale
src/design-system/tokens/spacing.ts      4px scale, layout dimensions, column widths
src/design-system/tokens/elevation.ts    Radii, shadows, z-index
src/design-system/tokens.css             Exported CSS custom properties
src/index.css                            Tailwind v4 @theme bindings
```

`contrast.ts` and `a11y.ts` are normative, not advisory: they turn WCAG 2.2
into requirements **derived from the tokens**, so changing a colour or a size
that breaks conformance fails the test suite instead of shipping.

## Execution Status Scale

Launch Item outcomes use a seven-family scale. Each family exposes the same
roles, so any state renders consistently across badges, progress meters,
tables and callouts.

```text
queued  running  pass  fail  timeout  retry  cancelled
```

| Role           | Class suffix        | Use                                        |
| -------------- | ------------------- | ------------------------------------------ |
| tinted surface | `-subtle`           | background behind status text              |
| outline        | `-border`           | border on a tinted surface                 |
| body text      | (bare, e.g. `fail`) | status label, ≥ 4.5:1 on `-subtle`         |
| emphasis       | `-strong`           | headings on a tinted surface               |
| solid fill     | `-solid`            | progress meters, solid buttons             |
| solid hover    | `-solid-hover`      | hover state of a solid fill                |
| on solid       | `-on-solid`         | text/icon placed on a solid fill, ≥ 4.5:1  |

```tsx
<div className="bg-fail-subtle border border-fail-border text-fail" />
<div className="bg-pass-solid" />
```

There is deliberately **no separate `fill` role**. SC 1.4.3 (4.5:1 for a label
on `onSolid`) and SC 1.4.11 (3:1 for the mark against `surface`) converge on
the same shade, so one `solid` role serves both the meter segment and the
text-bearing surface. Splitting them is what previously put white text on a
`#fbbf24` button at 1.94:1.

## Badge Tones

`BadgeTone` is a closed vocabulary. Do not invent a tone or reuse a colour
name as one.

```text
neutral  queued  running  pass  fail  timeout  retry  cancelled
```

`queued` (normal waiting) and `timeout` (degraded) MUST stay distinct: a
reviewer must be able to tell waiting from a problem without reading the
label. Before this contract both rendered as `warning`.

## Accessibility Contract

The token layer owns the WCAG 2.2 criteria it can decide. Everything below is
asserted in CI.

| Criterion                | Rule                                                        | Enforced by                        |
| ------------------------ | ----------------------------------------------------------- | ---------------------------------- |
| SC 1.4.1 Use of Color    | every state carries a text label; status `text` is unique    | `a11y.ts`, `BadgeToneContract`     |
| SC 1.4.3 Contrast (Min)  | body text ≥ 4.5:1 on every surface and tint                  | `contrast.test.ts`                 |
| SC 1.4.4 Resize Text     | every type step is `rem`-based                               | `a11y.test.ts`                     |
| SC 1.4.11 Non-text       | control borders and focus ring ≥ 3:1 on surface and canvas  | `contrast.test.ts`                 |
| SC 1.4.12 Text Spacing   | text-bearing line heights ≥ 1.25                             | `a11y.test.ts`                     |
| SC 2.4.11 Focus Appearance | focus ring ≥ 2px thick, offset, 3:1 colour                  | `a11y.test.ts`, `contrast.test.ts` |
| SC 2.5.8 Target Size     | interactive heights ≥ 24px                                  | `a11y.test.ts`                     |

`borderStrong` is a control boundary and is held to 3:1, not to `border`.
Adding a token without adding it to `contrast.ts` / `a11y.ts` is incomplete
work: the coverage of those lists is itself what makes the spec normative.

Criteria the token layer cannot govern (2.1.1 Keyboard, 4.1.2 Name/Role/Value,
1.4.13 Content on Hover or Focus) are component responsibilities and belong in
the component's own test.

## CSS Variable Naming

`tokens.css` cannot be generated from `colors.ts` (Tailwind v4 reads it through
`@theme`), so `cssNames.ts` owns the mapping and `tokensCss.test.ts` asserts it
in both directions: every token resolves to a declared variable with the same
value, and no variable exists without a token behind it. Default rule is
plain kebab-case (`borderStrong` → `--argus-color-border-strong`); the
overrides listed there exist so the utility classes stay idiomatic
(`text-muted-foreground`, `text-fail`).

## Hard Rules

The following are rejected by `pnpm --dir services/console lint:tokens`, which
runs inside `make validate` and CI:

- **No hardcoded hex** — `#fff`, `rgb(...)`, `hsl(...)`, `oklch(...)`,
  `color-mix(...)`. Every one of these can produce a colour that has no
  contrast assertion behind it. `color-mix()` is rejected even when its
  arguments are tokens: anything it derives is a token that does not exist
  yet, so nothing asserts its contrast either.
- **No raw palette utilities** — `bg-rose-50`, `text-slate-700`,
  `border-emerald-200`. Use the status scale or a semantic token.
- **No arbitrary values** — `w-[145px]`, `text-[11px]`, `max-h-[80vh]`.
  Use the container scale (`w-col-lg`, `min-w-table-xl`, `max-h-overlay-panel`)
  and the type scale (`text-micro`, `text-2xs`).

### When a raw value is genuinely unavoidable

Structural constructs — selectors and variant arguments, not design values —
are allowed but must be declared:

```tsx
// token-lint-ignore: has-[...] takes a selector, not a token value.
<label className="has-[:checked]:border-primary" />
```

Never use the marker to silence a colour or a size.

## Type Scale

`micro` (11px) and `2xs` (10px) are Argus additions for dense tables. The
remaining steps are Tailwind's defaults (`xs` 12px, `sm` 14px, `base` 16px,
`lg` 18px, `xl` 20px, `2xl` 24px) and MUST NOT be redefined in `@theme` —
doing so silently rescales every existing usage.

## Composition Rules

- Reach for an existing component before adding a new one:
  `Panel`, `PageHeader`, `Button`, `TextInput`, `SelectInput`, `TextArea`,
  `Badge`, `LoadingState` / `EmptyState` / `ErrorState`.
- Status is expressed by `Badge tone`, not by hand-picked classes.
- Layout shells use `layoutDimensions` (`w-sidebar`, `max-w-content`);
  tables use the `columnWidths` scale so columns stay aligned across views.
- Overlays size themselves with the same scale: `max-w-modal` (560px) for a
  confirmation, `max-w-modal-lg` (720px) for a dialog hosting a form,
  `max-w-drawer` (480px) for a drawer. A dialog does not pass its own width —
  it inherits the primitive's, so every overlay lands on the same geometry.
  `containerScale.test.ts` fails the build if a width utility is used with no
  `--container-*` behind it, because such a utility emits no CSS and the
  constraint disappears without any error.
- Depth and corners come from `elevation.ts`, and only from it:
  `shadow-xs|sm|md|lg` and `rounded-xs|sm|md|lg|xl|full`. Do not reach for
  `shadow-xl` or `shadow-2xl` — they are Tailwind steps the Argus scale does
  not define, and `shadow-2xl` alone (`0 25px 50px -12px rgb(0 0 0 / 0.25)`)
  is five times heavier than anything `elevation.ts` sanctions, which is what
  makes an overlay read as consumer app rather than control plane.
  `elevation.test.ts` rejects off-scale steps in both directions.
- A state that only changes colour is not a state. Every status surface pairs
  its tint with a label or a count.

## Before Committing

```bash
pnpm --dir services/console lint:tokens
pnpm --dir services/console test
pnpm --dir services/console typecheck
make validate
```

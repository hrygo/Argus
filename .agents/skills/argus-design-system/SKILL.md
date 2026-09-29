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
src/design-system/tokens/typography.ts   Font stacks and the type scale
src/design-system/tokens/spacing.ts      4px scale, layout dimensions, column widths
src/design-system/tokens/elevation.ts    Radii, shadows, z-index
src/design-system/tokens.css             Exported CSS custom properties
src/index.css                            Tailwind v4 @theme bindings
```

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
| body text      | (bare, e.g. `fail`) | status label, passes AA on `-subtle`       |
| emphasis       | `-strong`           | headings on a tinted surface               |
| solid fill     | `-solid`            | progress meters, solid buttons             |
| solid hover    | `-solid-hover`      | hover state of a solid fill                |
| on solid       | `-on-solid`         | text/icon placed on a solid fill           |

```tsx
<div className="bg-fail-subtle border border-fail-border text-fail" />
<div className="bg-pass-solid" />
```

## Hard Rules

The following are rejected by `pnpm --dir services/console lint:tokens`, which
runs inside `make validate` and CI:

- **No hardcoded hex** — `#fff`, `rgb(...)`, `hsl(...)`.
- **No raw palette utilities** — `bg-rose-50`, `text-slate-700`,
  `border-emerald-200`. Use the status scale or a semantic token.
- **No arbitrary values** — `w-[145px]`, `text-[11px]`, `max-h-[80vh]`.
  Use the container scale (`w-col-lg`, `min-w-table-xl`, `max-h-code-panel`)
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

## Before Committing

```bash
pnpm --dir services/console lint:tokens
pnpm --dir services/console test
make validate
```

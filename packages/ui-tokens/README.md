# @tend/ui-tokens

Tend's design tokens. `src/tokens.ts` is the only file you edit.

| Consumer | Import |
|---|---|
| `apps/web` (Tailwind v4) | `@import "@tend/ui-tokens/theme.css";` in `globals.css` |
| Plain CSS (landing page) | `@tend/ui-tokens/variables.css` |
| `apps/mobile` | `import { color, textStyle, nativeTextStyle } from '@tend/ui-tokens'` |

## Changing a token

1. Edit `src/tokens.ts`. New colors need an entry in `contrastPairs`.
2. `pnpm --filter @tend/ui-tokens css` to regenerate `css/`.
3. `pnpm --filter @tend/ui-tokens test` (contrast + generated-CSS check; also runs in CI).
4. Commit the token change on its own.

Scripts run TypeScript directly with Node's type stripping (Node 22.18+).

## Web utilities

- Colors: `bg-cream`, `text-ink`, `text-ink-soft`, `bg-door-blue`, `bg-deep-shade`, `border-line`, `border-line-strong`, `bg-door-blue-wash` (existing visual styling), optional `bg-door-blue-soft`
- Focus markers (future use only): `bg-focus-1` … `bg-focus-6`; never use them as text or card fills. Persist focus-color assignments when markers are introduced.
- Type: `type-display`, `type-title`, `type-heading`, `type-statement`, `type-body-lg`, `type-body`, `type-body-sm`, `type-label`, `type-caption`
- Fonts: `font-serif` (Fraunces), `font-sans` (Inter)
- Radius: `rounded-sm`, `rounded-md`, `rounded-lg`, `rounded-full`
- Width: `max-w-reading`, `max-w-app`
- Spacing: Tailwind's 4px scale (`p-4` = 16px)

Tailwind's default palette is removed, so `bg-blue-500` and similar don't exist.

## Design guardrails

Read [`docs/design-system.md`](../../docs/design-system.md) before altering UI tokens. Existing values are intentionally protected by a baseline test. A design-system prototype or agent instruction must not silently restyle shipped screens. When a value genuinely needs to change, update the code, baseline, and design documentation together, with desktop and mobile before/after screenshots.

# Review: week-step3-userfeeback

Uncommitted changes are sitting in the working tree, so this review covers only committed work (`origin/main...HEAD`). Not included:

- `apps/web/components/tend-flow/MakeRoomStep.tsx`
- `apps/web/components/tend-flow/PrioritizeStep.tsx`
- `apps/web/components/tend-flow/WeekAtAGlance.test.tsx`
- `apps/web/components/tend-flow/WeekAtAGlance.tsx`
- `apps/web/components/tend-flow/tend-flow.css`

Those five files are the Show/Hide card. I checked them in the browser, but they are not in this diff. Lint, build, and test below ran against the working tree, so the web build and tests include that uncommitted card. The lint error is in a committed file the working tree does not touch.

## Checks

- **lint** — failed. `@tend/web` `eslint .` reports one error, introduced on this branch: `apps/web/components/tend-flow/week-glance.test.ts:138` (`index` is defined but never used).
- **build** — passed (`@tend/core`, `@tend/api`, `@tend/web`).
- **test** — passed. `@tend/ui-tokens` contrast and generated CSS checks, `@tend/api` 31 tests, `@tend/web` 213 tests.

Node engine warnings (api wants Node >= 24.19, ui-tokens wants >= 22.18, current is 22.14) showed up and did not fail the commands.

## Blocking

**Lint fails on an unused argument in the color test.** In `week-glance.test.ts` the six-focus case maps titles with `(title, index)` and never reads `index`:

```137:142:apps/web/components/tend-flow/week-glance.test.ts
  it('gives six focuses distinct colors and keeps them when the list is reordered', () => {
    const focuses: Focus[] = ['Work', 'Health', 'Family', 'Home', 'Friends', 'Rest'].map((title, index) => ({
      id: title,
      title,
      actions: [action(title, title, true, [{ day: 'Mon', dayparts: ['Morning'] }])],
    }));
```

`pnpm --filter "...[origin/main]" run lint` exits 1 on that line (`@typescript-eslint/no-unused-vars`). Drop `index`, or name it `_index`, and lint is clean.

## Should fix

**More than six focuses makes `assignFocusColors` return a new array forever, and the planner effect will keep writing state.** The palette has six colors. The editor stops at `MAX_FOCUSES` (6), but `PlanStateSchema` still accepts up to 10 focuses, including a restored `#w=` link.

Give `assignFocusColors` seven focuses with no `colorIndex`. The first six take 0–5. The seventh hits this branch:

```32:36:packages/core/src/weekly-plan/focus-color.ts
    let next = 0;
    while (used.has(next)) next += 1;
    const colorIndex = next < FOCUS_PALETTE_SIZE ? next : next % FOCUS_PALETTE_SIZE;
    used.add(colorIndex);
    return { ...focus, colorIndex };
```

`next` is 6, so `colorIndex` becomes `0`, which the first focus already owns. On the next call that `0` is not claimable, `kept` is not all filled, and the function returns a new array again. `TendFlow` then does this on every `focuses` change:

```74:77:apps/web/components/tend-flow/TendFlow.tsx
  useEffect(() => {
    const next = assignFocusColors(focuses);
    if (next !== focuses) setFocuses(next);
  }, [focuses, setFocuses]);
```

`next !== focuses` stays true, so React re-renders in a loop. A normal week built in the app never adds a seventh focus, which is why nothing caught it. A restored plan with 7–10 focuses would. Once every palette index is taken, return the same array (and accept a repeated color) instead of wrapping with `%`.

## Nits

`alreadyPlannedHeading` and `otherPlansAt` in `week-glance.ts` (lines 74–86) are unused. They still describe the old per-daypart heading (“Already planned for Wednesday evening”). The picker now lists the whole day. I would delete them so the next change does not revive that copy.

In the same color test, `reordered` is only checked for the title “Rest”, and `colored` is `assignFocusColors(focuses)` whenever the glance has any plans, which it does. The assertion that actually locks colors across a reorder is `again` just below. The extra lines do not add coverage.

## Questions

`glanceSummary` counts each day + daypart placement as an “action”. Strength training on Monday, Thursday, and Saturday becomes three toward “N actions”, and toward `planCount`. The day columns do the same, which reads clearly there. Do you want the collapsed pill to count placements, or distinct actions?

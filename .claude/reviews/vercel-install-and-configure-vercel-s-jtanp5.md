# Review: vercel/install-and-configure-vercel-s-jtanp5

Against `origin/main`. Working tree is clean, so this covers the committed commits only (`f538d64`, plus the merge of `main`).

## Checks

- **lint** — passed (`pnpm --filter "...[origin/main]" run --if-present lint`)
- **build** — passed. `@tend/web` production build compiled and generated `/`, `/plan/week`, `/goals/[goalId]/edit`, and `/api/send-week`
- **test** — passed. Web: 25 files, 187 tests. The same filter also ran `@tend/api` and `@tend/ui-tokens` tests; those passed too
- **CI** — the current PR run is green. The first push on this branch failed lint on `YourWeekStep.tsx` (`Cannot access refs during render`). That error is not in this diff; the merge from `main` cleared it, and lint is clean now

## Blocking

None.

## Should fix

`apps/web/next-env.d.ts` should not be in this change. Lines 3–4 now import `./.next/types/routes.d.ts` and `./.next/types/root-params.d.ts`. On `main` those imports point at `./.next/dev/types/…`, which is what `next dev` writes.

Next.js 16 keeps dev and production output in different directories (`.next/dev` vs `.next`) and rewrites `next-env.d.ts` to match whichever command ran last. I ran `next build` on this branch and the file stayed identical to the commit, so this hunk is the build’s generated output, not part of the Speed Insights install. The next `next dev` will write the dev paths back and leave the working tree dirty.

Please drop this file from the commit. The Speed Insights change itself does not need it.

## Nits

Next’s own docs recommend gitignoring `next-env.d.ts`, because `next dev` and `next build` both rewrite it. That would stop this kind of churn. Separate from this PR if you’d rather keep the file tracked the way `main` has it.

## Questions

None. `<SpeedInsights />` in `apps/web/app/layout.tsx` matches the App Router quickstart: imported from `@vercel/speed-insights/next` and rendered inside `<body>`. The package wraps its own `useSearchParams()` in `Suspense`, and the production build still prerendered the static routes. In `next dev` the package loads its debug script and does not send vitals.

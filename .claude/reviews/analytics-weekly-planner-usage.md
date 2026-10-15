# Review: `analytics/weekly-planner-usage`

Reviewed against `origin/main` (`c7a2cec`). Working tree was clean, so this is the committed branch only: `cdea248` and `ce58fa4`.

## Checks

- **lint** — passed (`apps/web`, and the recursive script also linted `apps/api`)
- **build** — passed (`apps/web` production build)
- **test** — passed (`apps/web` 234, `apps/api` 31, `ui-tokens` baseline/contrast/css)

Node engine warnings only (`node` 22.14 vs the engines field). Nothing failed.

## Blocking

None.

## Should fix

### PostHog still receives the week itself

`docs/analytics.md` says events are counts only: no focus titles, action labels, or room items. The custom events do that. The PostHog client init does not.

`instrumentation-client.ts` sets `defaults: '2026-05-30'`. In posthog-js 1.434.0 that keeps the older defaults: `autocapture: true`, and `disable_capture_url_hashes` only turns on at `2026-06-25`. The initial `$pageview` is scheduled 1ms after `posthog.init`, and `PlanFlow` only strips `#w=` after `decodePlanLink` resolves. So the sequence is:

1. Open the week email (`/plan/week?source=week_email#w=…`).
2. PostHog sends `$pageview` with `$current_url` still containing `#w=`.
3. That fragment is the deflated plan (`encodePlanLink` stores focus titles, action labels, and room items).
4. A click on an action or focus then sends `$autocapture` with the element text.

This already happens on `origin/main` (the email link already had `#w=`). This branch is the right place to close it: it writes the rule down and already edits the init. I would set `disable_capture_url_hashes: true` and `autocapture: false` (or an allowlist that cannot include planner text) before trusting production numbers.

`?analytics=off` is fine. `opt_out_capturing()` runs synchronously, and the pageview waits until the next tick and checks consent.

### `duration_seconds` is how long the tab stayed open

`rememberStartTime` stores `Date.now()` once, in `sessionStorage`, when `weekly_plan_started` fires. `secondsSinceStart` then reports whole seconds until `weekly_plan_completed`, with no cap and no pause while the tab is hidden.

Concrete case: add a focus, leave the tab open for two days, then reach Your week. `weekly_plan_completed` is sent with `duration_seconds` around 172800. Insight 4 calls that "time to plan" and takes a median. With a small number of people, one idle tab moves the number.

I would either cap it, count only visible time, or describe the insight as elapsed time in that tab since the plan started.

## Questions

- The funnel in `docs/analytics.md` breaks down by `device_type` and `source`, but those properties are only on `weekly_plan_started` and `weekly_plan_reopened`. `plan_step_viewed` is the first funnel step and does not carry them. If PostHog reads the breakdown from the first step, that split will be empty. Was the breakdown meant to be on the started event only?
- After a reopen, Edit week and then See your week calls `trackWeeklyPlanCompleted` even though this session never fired `weekly_plan_started` (completion is still "left Make room for Your week"). That person shows up in "weekly planners" as well as in reopens. Is that the count you want?

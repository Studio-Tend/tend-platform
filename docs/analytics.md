# Planner analytics

What we measure about `/plan/week`, and how to read it in PostHog.

The question behind all of it: **do people come back to plan the next week?** Starts and completions show whether the planner works once. Returns show whether it is a weekly habit.

## Rules

- **Counts only, never content.** No focus titles, action labels, room items or email addresses go into events. Our own events only carry counts, and the SDKs are configured so they cannot pick up content on their own:
  - PostHog autocapture, dead clicks and heatmaps are off, so clicking a row never sends its label. Session recording is off. (`lib/posthog-config.ts`)
  - URL hashes are stripped before anything is sent. The reopen link keeps the whole plan in `#w=`, and the first pageview fires before the planner clears it. PostHog strips it with `disable_capture_url_hashes`, and Vercel Analytics and Speed Insights strip it in `beforeSend` (`components/site/SiteAnalytics.tsx`).
  - `lib/posthog-config.test.ts` runs the real PostHog SDK on a reopen URL and fails if any part of the plan would be sent.
- **Production only.** Events are sent only when `NODE_ENV=production` and Vercel's environment is `production` (see `lib/analytics-env.ts`). Staging, preview deploys and `next dev` send nothing.
- **Exclude your own use.** On each browser you test with, open any page once with `?analytics=off`. PostHog remembers it in that browser. `?analytics=on` reverses it.
- **Identity is per browser.** People are anonymous. Someone who plans on a phone one week and a laptop the next counts as two people, so returns are undercounted. Linking people across devices (for example through the email address) is a privacy decision and would need its own ADR.

## Events

All planner events carry `session_id`, which is one browser tab's planning session (sessionStorage). "Start over" begins a new session.

| Event | Fires when | Properties |
|---|---|---|
| `plan_step_viewed` | A step is shown, including going back | `step` (`focuses`, `actions`, `prioritize`, `makeRoom`, `yourWeek`), `step_number`, `focus_index` (actions only, 0-based), `source`, `device_type` |
| `weekly_plan_started` | First focus added, or Continue from step 1. Once per session | `source`, `device_type` |
| `action_scheduled` | An action gets its first day | |
| `weekly_plan_completed` | Leaving Make room for Your week with at least one action. Once per session | `focus_count`, `action_count`, `scheduled_action_count`, `unscheduled_action_count`, `from_reopen_link`, `active_seconds` (only when the plan started in this session) |
| `plan_started_over` | Start over is confirmed | `step` |
| `send_week_clicked` | The email form is opened | `action_count` |
| `week_email_submitted` / `week_email_failed` | The browser gets a reply from `/api/send-week` | `marketing_opt_in` (submitted) |
| `week_email_sent` | Server side, after Resend accepts the message | `provider`, `send_status` |
| `weekly_plan_reopened` | A week is restored from the email's `#w=` link | `source`, `device_type`, plan counts |
| `plan_link_invalid` | A `#w=` link was present but could not be read | `source` |
| `waitlist_clicked` / `waitlist_submitted` | Waitlist button / form, on the site or after planning | |

`source` is `?source=`, then `?utm_source=`, then the external referrer host, else `direct`. The week email's reopen link carries `?source=week_email`, because email clients strip the referrer.

`active_seconds` counts only time the planner tab was visible, from the first focus to Your week, and survives a reload in the same tab. A tab left in the background does not add to it. A tab left open and visible on screen still does.

`from_reopen_link` is true when the session began by opening a week from the email, and the person then went back and returned to Your week. That session never fires `weekly_plan_started` and has no `active_seconds`.

## Insights to set up in PostHog

1. **Weekly planners** (the main number). Trends: unique users with `weekly_plan_completed`, interval week. This counts a reopened week that was revised as planning. To count only plans built from scratch, filter `from_reopen_link = false`.
2. **Return rate.** Retention: start event `weekly_plan_completed`, return event `weekly_plan_completed` or `weekly_plan_reopened`, period week.
3. **Planner funnel.** Funnel, aggregated by unique users: `plan_step_viewed` (step = focuses) → `weekly_plan_started` → `plan_step_viewed` (step = prioritize) → `plan_step_viewed` (step = makeRoom) → `weekly_plan_completed` → `send_week_clicked` → `week_email_sent`. Break down by `device_type` or `source`. Both are on every step, so the breakdown works whichever step PostHog reads it from.
4. **Time to plan.** Trends: median of `active_seconds` on `weekly_plan_completed`, weekly. Use the median, not the average: a tab left visible on a desktop overnight still inflates one data point.
5. **Reopen health.** Trends: `weekly_plan_reopened` and `plan_link_invalid` side by side. Any invalid links point to a bug in the link format.

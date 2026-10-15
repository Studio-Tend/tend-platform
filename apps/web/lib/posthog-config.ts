import type { PostHogConfig } from 'posthog-js';

/**
 * Browser PostHog settings. Kept apart from `instrumentation-client.ts` so a
 * test can run the real SDK against them.
 *
 * The rule (docs/analytics.md) is counts only, never plan content. Two SDK
 * defaults break it, so they are set explicitly instead of relying on the
 * `defaults` date:
 * - URL hashes. The reopen link carries the whole plan in `#w=`, and the
 *   first $pageview is sent before PlanFlow clears it. Stripping hashes keeps
 *   them out of $current_url, session entry and initial person properties.
 * - Autocapture. A click on a focus, action or room item would send its label
 *   as element text. Dead clicks and heatmaps can be switched on from PostHog
 *   project settings, so they are pinned off here too.
 */
export const POSTHOG_CONFIG = {
  api_host: '/ingest',
  ui_host: 'https://us.posthog.com',
  defaults: '2026-05-30',
  disable_capture_url_hashes: true,
  autocapture: false,
  capture_dead_clicks: false,
  capture_heatmaps: false,
  // Recording would show plan content. Keep it off unless input and text
  // masking are set up first.
  disable_session_recording: true,
} satisfies Partial<PostHogConfig>;

import posthog from 'posthog-js';
import { isAnalyticsEnvironment } from './lib/analytics-env';
import { POSTHOG_CONFIG } from './lib/posthog-config';

const token = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;

if (token && isAnalyticsEnvironment(process.env.NODE_ENV, process.env.NEXT_PUBLIC_VERCEL_ENV)) {
  posthog.init(token, {
    ...POSTHOG_CONFIG,
    // Same-origin API calls (send-week) carry the browser person + session.
    tracing_headers: [window.location.hostname],
  });

  // Keep our own testing out of the numbers: open any page once with
  // ?analytics=off on each browser you use. PostHog remembers the choice in
  // that browser until it is reversed with ?analytics=on. This runs before
  // the first $pageview, which PostHog sends on the next tick.
  const preference = new URLSearchParams(window.location.search).get('analytics');
  if (preference === 'off') posthog.opt_out_capturing();
  if (preference === 'on') posthog.opt_in_capturing();
}

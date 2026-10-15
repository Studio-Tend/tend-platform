import posthog from 'posthog-js';
import { isAnalyticsEnvironment } from './analytics-env';
import { compactProperties, type AnalyticsProperties } from './analytics-properties';

export type { AnalyticsProperties };

/**
 * Client-side PostHog event. No-ops in next dev, on Vercel preview/staging
 * deploys, and until the project token is set.
 */
export function track(event: string, properties?: AnalyticsProperties): void {
  if (typeof window === 'undefined') return;
  if (!isAnalyticsEnvironment(process.env.NODE_ENV, process.env.NEXT_PUBLIC_VERCEL_ENV)) return;
  if (!process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN) return;
  posthog.capture(event, compactProperties(properties));
}

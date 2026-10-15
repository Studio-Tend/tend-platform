'use client';

import { Analytics, type BeforeSendEvent } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { stripUrlHash } from '@/lib/strip-url-hash';

/** Vercel's URL hook, shared by Analytics and Speed Insights. */
export function withoutUrlHash<T extends Pick<BeforeSendEvent, 'url'>>(event: T): T {
  return { ...event, url: stripUrlHash(event.url) };
}

/**
 * Vercel Web Analytics and Speed Insights, with the `#w=` plan fragment
 * removed from every URL they report. Client-only because `beforeSend` is a
 * function, which the server layout cannot pass down.
 */
export function SiteAnalytics() {
  return (
    <>
      <Analytics beforeSend={withoutUrlHash} />
      <SpeedInsights beforeSend={withoutUrlHash} />
    </>
  );
}

import { PostHog } from 'posthog-node';
import { isAnalyticsEnvironment } from './analytics-env';
import { compactProperties, type AnalyticsProperties } from './analytics-properties';

/**
 * Server-side PostHog event. No-ops in next dev, on Vercel preview/staging
 * deploys, and until the project token is set.
 */
export async function track(
  event: string,
  properties?: AnalyticsProperties,
  options?: { headers?: Headers },
): Promise<void> {
  if (!isAnalyticsEnvironment(process.env.NODE_ENV, process.env.VERCEL_ENV)) return;

  const token = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;
  if (!token || !host) return;

  const distinctId = distinctIdFrom(properties, options?.headers);
  if (!distinctId) return;

  const sessionId = options?.headers?.get('x-posthog-session-id')?.trim();
  const client = new PostHog(token, { host, flushAt: 1, flushInterval: 0 });
  try {
    client.capture({
      distinctId,
      event,
      properties: {
        ...compactProperties(properties),
        ...(sessionId ? { $session_id: sessionId } : {}),
      },
    });
  } finally {
    await client.shutdown();
  }
}

function distinctIdFrom(properties?: AnalyticsProperties, headers?: Headers): string | null {
  const fromHeader = headers?.get('x-posthog-distinct-id')?.trim();
  if (fromHeader) return fromHeader;
  const sessionId = typeof properties?.session_id === 'string' ? properties.session_id.trim() : '';
  return sessionId || null;
}

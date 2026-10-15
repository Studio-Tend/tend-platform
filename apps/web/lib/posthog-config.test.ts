import posthog, { type CaptureResult } from 'posthog-js';
import { afterEach, describe, expect, it } from 'vitest';
import { POSTHOG_CONFIG } from './posthog-config';

// A reopen link: the fragment is the compressed plan.
const REOPEN_URL = '/plan/week?source=week_email#w=PLAN-CONTENT-Finish-portfolio';

afterEach(() => {
  window.history.replaceState(null, '', '/');
});

/** Runs the real SDK with our config and returns what it would have sent. */
async function captureFirstPageview(): Promise<CaptureResult[]> {
  const sent: CaptureResult[] = [];
  const instance = posthog.init(
    'phc_test_token',
    {
      ...POSTHOG_CONFIG,
      // Nothing leaves the test: stop remote config and drop every event.
      advanced_disable_flags: true,
      disable_external_dependency_loading: true,
      before_send: (event) => {
        if (event) sent.push(event);
        return null;
      },
    },
    `test-${Math.random().toString(36).slice(2)}`,
  );
  expect(instance).toBeDefined();
  // The first $pageview is scheduled on the next tick after init.
  await new Promise((resolve) => setTimeout(resolve, 20));
  return sent;
}

describe('POSTHOG_CONFIG', () => {
  it('sends the reopen pageview without the plan in the URL', async () => {
    window.history.replaceState(null, '', REOPEN_URL);

    const sent = await captureFirstPageview();
    const pageview = sent.find((event) => event.event === '$pageview');

    expect(pageview).toBeDefined();
    const serialized = JSON.stringify(sent);
    expect(serialized).not.toContain('PLAN-CONTENT');
    expect(serialized).not.toContain('#w=');
    expect(String(pageview?.properties.$current_url)).toContain('/plan/week?source=week_email');
  });

  it('turns off every capture that could read text off the page', () => {
    expect(POSTHOG_CONFIG).toMatchObject({
      autocapture: false,
      capture_dead_clicks: false,
      capture_heatmaps: false,
      disable_session_recording: true,
      disable_capture_url_hashes: true,
    });
  });
});

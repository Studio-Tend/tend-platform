import { describe, expect, it } from 'vitest';
import { stripUrlHash } from '@/lib/strip-url-hash';
import { withoutUrlHash } from './SiteAnalytics';

describe('stripUrlHash', () => {
  it('removes the plan fragment and keeps the query', () => {
    expect(stripUrlHash('https://www.heytend.co/plan/week?source=week_email#w=abc')).toBe(
      'https://www.heytend.co/plan/week?source=week_email',
    );
    expect(stripUrlHash('https://www.heytend.co/#waitlist')).toBe('https://www.heytend.co/');
    expect(stripUrlHash('https://www.heytend.co/plan/week')).toBe('https://www.heytend.co/plan/week');
  });
});

describe('withoutUrlHash', () => {
  it('keeps the rest of the Vercel event as is', () => {
    const event = { type: 'pageview' as const, url: 'https://www.heytend.co/plan/week#w=abc' };
    expect(withoutUrlHash(event)).toEqual({ type: 'pageview', url: 'https://www.heytend.co/plan/week' });
  });
});

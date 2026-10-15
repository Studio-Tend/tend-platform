import { describe, expect, it } from 'vitest';
import { isAnalyticsEnvironment } from './analytics-env';

describe('isAnalyticsEnvironment', () => {
  it('reports only from the Vercel production environment', () => {
    expect(isAnalyticsEnvironment('production', 'production')).toBe(true);
    expect(isAnalyticsEnvironment('production', 'preview')).toBe(false);
    expect(isAnalyticsEnvironment('production', 'staging')).toBe(false);
    expect(isAnalyticsEnvironment('production', 'development')).toBe(false);
  });

  it('never reports from next dev or tests', () => {
    expect(isAnalyticsEnvironment('development', 'production')).toBe(false);
    expect(isAnalyticsEnvironment('test', undefined)).toBe(false);
  });

  it('still reports from a production build outside Vercel', () => {
    expect(isAnalyticsEnvironment('production', undefined)).toBe(true);
    expect(isAnalyticsEnvironment('production', '')).toBe(true);
  });
});

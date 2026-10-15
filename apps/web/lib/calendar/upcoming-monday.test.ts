// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { upcomingMonday } from './upcoming-monday';

describe('upcomingMonday', () => {
  it('maps Friday to the next Monday', () => {
    expect(upcomingMonday(new Date('2026-09-18T15:00:00Z'), 'UTC')).toBe('2026-09-21');
  });

  it('maps Sunday to the next day', () => {
    expect(upcomingMonday(new Date('2026-09-20T15:00:00Z'), 'UTC')).toBe('2026-09-21');
  });

  it('maps Monday to the same day', () => {
    expect(upcomingMonday(new Date('2026-09-21T15:00:00Z'), 'UTC')).toBe('2026-09-21');
  });

  it('uses the person\'s calendar date, not the server\'s', () => {
    const boundary = new Date('2026-09-22T02:00:00Z');
    expect(upcomingMonday(boundary, 'America/New_York')).toBe('2026-09-21');
    expect(upcomingMonday(boundary, 'UTC')).toBe('2026-09-28');
  });
});

// @vitest-environment node
import { render } from '@react-email/components';
import { layoutWeek } from '@tend/core';
import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import { seedFocuses, seedRoomItems } from '@/components/tend-flow/seed-data';
import { WeekEmail } from './WeekEmail';

describe('WeekEmail', () => {
  it('renders agenda rows and the send copy', async () => {
    const html = await render(
      createElement(WeekEmail, {
        week: layoutWeek(seedFocuses(), seedRoomItems()),
        weekStart: '2026-09-21',
        planUrl: 'https://www.heytend.co/plan/week#w=preview',
      }),
    );

    expect(html).toContain('SEP 21 – 27');
    expect(html).toContain('What you');
    expect(html).toContain('MORNING');
    expect(html).toContain('AFTERNOON');
    expect(html).toContain('EVENING');
    expect(html).toContain('Nothing planned');
    expect(html).toContain('Not yet scheduled');
    expect(html).toContain('Finish portfolio case study');
    expect(html).toContain('✦');
    expect(html).toContain('Dinner with friends');
    expect(html).toContain('tend-week-Sep-21-27.ics');
    expect(html).toContain('Mornings land 9–12');
    expect(html).toContain('Open this week in the planner');
    expect(html).toContain('https://www.heytend.co/plan/week#w=preview');
    expect(html).toContain('Join the waitlist');
    expect(html).toContain('https://www.heytend.co/#waitlist');
  });
});

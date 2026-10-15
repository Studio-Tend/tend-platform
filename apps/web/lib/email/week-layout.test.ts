import { layoutWeek } from '@tend/core';
import { describe, expect, it } from 'vitest';
import { seedFocuses, seedRoomItems } from '@/components/tend-flow/seed-data';
import {
  calendarHoursPhrase,
  emailDayHeading,
  emailDayLabel,
  emailDayStamp,
  emailWeekRangeLabel,
  icsFilename,
  waitlistUrlFromPlan,
  weekEmailText,
  weekRangeLabel,
} from './week-layout';

const weekStart = '2026-09-21';
const planUrl = 'https://www.heytend.co/plan/week#w=preview';

describe('email agenda labels', () => {
  it('splits weekday and date for an agenda row', () => {
    expect(emailDayStamp('Tue', weekStart)).toEqual({ weekday: 'TUE', date: 22 });
    expect(emailDayLabel('Tue', weekStart)).toBe('TUE 22');
  });

  it('names a day for the narrow week heading', () => {
    expect(emailDayHeading('Mon', '2026-09-28')).toBe('Monday, Sep 28');
    expect(emailDayHeading('Sun', '2026-09-28')).toBe('Sunday, Oct 4');
  });

  it('uppercases the week range in the body, with a spaced dash', () => {
    expect(weekRangeLabel(weekStart)).toBe('Sep 21–27');
    expect(emailWeekRangeLabel(weekStart)).toBe('SEP 21 – 27');
  });

  it('names both months when the week crosses one', () => {
    expect(emailWeekRangeLabel('2026-09-28')).toBe('SEP 28 – OCT 4');
  });

  it('puts the week range in the calendar attachment name', () => {
    expect(icsFilename(weekStart)).toBe('tend-week-Sep-21-27.ics');
    expect(icsFilename('2026-09-28')).toBe('tend-week-Sep-28-Oct-4.ics');
  });
});

describe('calendar hours copy', () => {
  it('follows DAYPART_HOURS in 12-hour clock', () => {
    expect(calendarHoursPhrase()).toBe('Mornings land 9–12, afternoons 1–5, evenings 6–9');
  });
});

describe('waitlistUrlFromPlan', () => {
  it('points at the homepage waitlist on the same origin', () => {
    expect(waitlistUrlFromPlan(planUrl)).toBe('https://www.heytend.co/#waitlist');
  });
});

describe('weekEmailText', () => {
  it('lays the week out as agenda rows with the send copy', () => {
    const text = weekEmailText(layoutWeek(seedFocuses(), seedRoomItems()), weekStart, planUrl);

    expect(text).toContain('SEP 21 – 27');
    expect(text).toContain("What you're tending to, and what you're making room for.");
    expect(text).toMatch(/MON 21\n {2}Nothing planned/);
    expect(text).toContain(
      ['TUE 22', '  AFTERNOON', '    Finish portfolio case study', '      Career development', '  EVENING', '    Strength training'].join(
        '\n',
      ),
    );
    expect(text).toContain(
      [
        'THU 24',
        '  MORNING',
        '    Strength training',
        '      Get stronger',
        '  EVENING',
        '    Strength training',
        '      Get stronger',
      ].join('\n'),
    );
    expect(text).toContain('✦ Dinner with friends');
    expect(text).toContain('✦ Beach walk');
    expect(text).toContain('NOT YET SCHEDULED');
    expect(text).toContain('ADD IT TO YOUR CALENDAR');
    expect(text).toContain('Open the attached tend-week-Sep-21-27.ics.');
    expect(text).toContain('Mornings land 9–12, afternoons 1–5, evenings 6–9');
    expect(text).toContain('CHANGE SOMETHING');
    expect(text).toContain(planUrl);
    expect(text).toContain('Join the waitlist to follow along.');
    expect(text).toContain('https://www.heytend.co/#waitlist');
    expect(text).toContain("You're getting this because you asked for your week at heytend.co.");
  });

  it('puts a room intention under the activity', () => {
    const text = weekEmailText(
      layoutWeek([], [
        { id: 'dinner', label: 'Dinner', intention: 'Connection', slots: [{ day: 'Fri', dayparts: ['Evening'] }] },
      ]),
      weekStart,
      planUrl,
    );

    expect(text).toContain(['    ✦ Dinner', '      Connection'].join('\n'));
  });
});

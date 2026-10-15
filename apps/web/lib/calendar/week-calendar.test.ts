// @vitest-environment node
import { layoutWeek, type Focus, type RoomItem } from '@tend/core';
import { describe, expect, it } from 'vitest';
import { buildWeekCalendar } from './week-calendar';

const weekStart = '2026-09-21';
const timeZone = 'America/New_York';

function calendarFor(focuses: Focus[], roomItems: RoomItem[] = [], start = weekStart, zone = timeZone) {
  return buildWeekCalendar({
    week: layoutWeek(focuses, roomItems),
    weekStart: start,
    timeZone: zone,
  });
}

describe('buildWeekCalendar', () => {
  it('writes Tuesday morning as UTC instants for America/New_York', () => {
    const ics = calendarFor([
      {
        id: 'job',
        title: 'Job',
        actions: [
          {
            id: 'a1',
            label: 'Finish case study',
            checked: true,
            slots: [{ day: 'Tue', dayparts: ['Morning'] }],
          },
        ],
      },
    ]);

    expect(ics).toContain('DTSTART:20260922T130000Z');
    expect(ics).toContain('DTEND:20260922T160000Z');
    expect(ics).toContain('TRANSP:TRANSPARENT');
    expect(ics).toContain('METHOD:PUBLISH');
  });

  it('creates one event per daypart', () => {
    const ics = calendarFor([
      {
        id: 'strength',
        title: 'Get stronger',
        actions: [
          {
            id: 'a7',
            label: 'Strength training',
            checked: true,
            slots: [{ day: 'Thu', dayparts: ['Morning', 'Evening'] }],
          },
        ],
      },
    ]);

    expect(ics).toContain('DTSTART:20260924T130000Z');
    expect(ics).toContain('DTEND:20260924T160000Z');
    expect(ics).toContain('DTSTART:20260924T220000Z');
    expect(ics).toContain('DTEND:20260925T010000Z');
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(2);
  });

  it('uses an all-day date when a day has no daypart', () => {
    const ics = calendarFor([
      {
        id: 'job',
        title: 'Job',
        actions: [
          {
            id: 'a1',
            label: 'Finish case study',
            checked: true,
            slots: [{ day: 'Tue', dayparts: [] }],
          },
        ],
      },
    ]);

    expect(ics).toContain('DTSTART;VALUE=DATE:20260922');
  });

  it('leaves unscheduled entries out of the file', () => {
    const ics = calendarFor(
      [
        {
          id: 'job',
          title: 'Job',
          actions: [{ id: 'a2', label: 'Reach out to Sarah', checked: true, slots: [] }],
        },
      ],
      [{ id: 'r1', label: 'Beach walk', slots: [] }],
    );

    expect(ics).not.toContain('Reach out to Sarah');
    expect(ics).not.toContain('Beach walk');
    expect(ics.match(/BEGIN:VEVENT/g)).toBeNull();
  });

  it('keeps UIDs stable across builds', () => {
    const focuses: Focus[] = [
      {
        id: 'job',
        title: 'Job',
        actions: [
          {
            id: 'a1',
            label: 'Finish case study',
            checked: true,
            slots: [{ day: 'Tue', dayparts: ['Morning'] }],
          },
        ],
      },
    ];
    const first = calendarFor(focuses);
    const second = calendarFor(focuses);
    const uids = (ics: string) => [...ics.matchAll(/^UID:(.+)$/gm)].map((match) => match[1]);
    expect(uids(first)).toEqual(uids(second));
  });

  it('uses the wall time after a US DST change', () => {
    const ics = calendarFor(
      [
        {
          id: 'life',
          title: 'Life',
          actions: [
            {
              id: 'sun',
              label: 'Sunday evening',
              checked: true,
              slots: [{ day: 'Sun', dayparts: ['Evening'] }],
            },
            {
              id: 'mon',
              label: 'Monday morning',
              checked: true,
              slots: [{ day: 'Mon', dayparts: ['Morning'] }],
            },
          ],
        },
      ],
      [],
      '2026-10-26',
      'America/New_York',
    );

    expect(ics).toContain('DTSTART:20261101T230000Z');
    expect(ics).toContain('DTSTART:20261026T130000Z');
  });
});

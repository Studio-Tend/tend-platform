import {
  DAYPART_HOURS,
  DAYPARTS,
  DAYS,
  laneKey,
  type Day,
  type Daypart,
  type WeekEntry,
  type WeekLayout,
} from '@tend/core';

export const WEEK_EMAIL_INTRO =
  "What you're tending to, and what you're making room for.";

export const EMPTY_DAY_LABEL = 'Nothing planned';

export const WEEK_EMAIL_ORIGIN =
  "You're getting this because you asked for your week at heytend.co. We didn't add you to anything.";

/**
 * Hand-sorted lane positions are 0-based, so anything never sorted has to
 * land after them. Kept in step with the same base in the week board.
 */
const UNSORTED_BASE = 10_000;

export interface EmailLane {
  label: string;
  entries: WeekEntry[];
}

function orderInLane(entry: WeekEntry, day: Day, daypart: Daypart | null): number {
  return entry.laneOrders?.[laneKey(day, daypart)] ?? UNSORTED_BASE + entry.sequence;
}

/**
 * Occupied times of day for one agenda row, in the same order as the week
 * screen. An item on two times of day appears under each heading.
 */
export function emailDayLanes(day: Day, entries: WeekEntry[]): EmailLane[] {
  const timed = DAYPARTS.flatMap((daypart) => {
    const inLane = entries
      .filter((entry) => entry.dayparts.includes(daypart))
      .sort((a, b) => orderInLane(a, day, daypart) - orderInLane(b, day, daypart));
    return inLane.length > 0 ? [{ label: daypart.toUpperCase(), entries: inLane }] : [];
  });
  const anytime = entries
    .filter((entry) => entry.dayparts.length === 0)
    .sort((a, b) => orderInLane(a, day, null) - orderInLane(b, day, null));
  return anytime.length > 0 ? [...timed, { label: 'ANYTIME', entries: anytime }] : timed;
}

function civilDateForDay(weekStart: string, day: Day): Date {
  const [year, month, date] = weekStart.split('-').map(Number);
  const offset = DAYS.indexOf(day);
  return new Date(Date.UTC(year, month - 1, date + offset, 12));
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

function monthDay(date: Date): { month: string; day: number } {
  return { month: MONTHS[date.getUTCMonth()], day: date.getUTCDate() };
}

const DAY_TITLE: Record<Day, string> = {
  Mon: 'Monday',
  Tue: 'Tuesday',
  Wed: 'Wednesday',
  Thu: 'Thursday',
  Fri: 'Friday',
  Sat: 'Saturday',
  Sun: 'Sunday',
};

/** Weekday and date number for an agenda row, e.g. `{ weekday: 'TUE', date: 22 }`. */
export function emailDayStamp(day: Day, weekStart: string): { weekday: string; date: number } {
  return { weekday: day.toUpperCase(), date: monthDay(civilDateForDay(weekStart, day)).day };
}

/** Narrow-week heading, e.g. `Monday, Sep 28`. */
export function emailDayHeading(day: Day, weekStart: string): string {
  const { month, day: date } = monthDay(civilDateForDay(weekStart, day));
  return `${DAY_TITLE[day]}, ${month} ${date}`;
}

/** Compact agenda label, e.g. `TUE 22`. */
export function emailDayLabel(day: Day, weekStart: string): string {
  const { weekday, date } = emailDayStamp(day, weekStart);
  return `${weekday} ${date}`;
}

/**
 * Subject range in the person's week, e.g. `Sep 21–27` or `Sep 28 – Oct 4`
 * when the week crosses a month.
 */
export function weekRangeLabel(weekStart: string): string {
  const start = civilDateForDay(weekStart, 'Mon');
  const end = civilDateForDay(weekStart, 'Sun');
  const from = monthDay(start);
  const to = monthDay(end);
  if (from.month === to.month) {
    return `${from.month} ${from.day}–${to.day}`;
  }
  return `${from.month} ${from.day} – ${to.month} ${to.day}`;
}

/** Body eyebrow, e.g. `SEP 21 – 27`. */
export function emailWeekRangeLabel(weekStart: string): string {
  const start = civilDateForDay(weekStart, 'Mon');
  const end = civilDateForDay(weekStart, 'Sun');
  const from = monthDay(start);
  const to = monthDay(end);
  if (from.month === to.month) {
    return `${from.month.toUpperCase()} ${from.day} – ${to.day}`;
  }
  return `${from.month.toUpperCase()} ${from.day} – ${to.month.toUpperCase()} ${to.day}`;
}

/** Calendar attachment name, e.g. `tend-week-Sep-21-27.ics`. */
export function icsFilename(weekStart: string): string {
  const start = civilDateForDay(weekStart, 'Mon');
  const end = civilDateForDay(weekStart, 'Sun');
  const from = monthDay(start);
  const to = monthDay(end);
  const range =
    from.month === to.month
      ? `${from.month}-${from.day}-${to.day}`
      : `${from.month}-${from.day}-${to.month}-${to.day}`;
  return `tend-week-${range}.ics`;
}

function clockHour(hour: number): number {
  const twelve = hour % 12;
  return twelve === 0 ? 12 : twelve;
}

function clockRange(daypart: Daypart): string {
  const { startHour, endHour } = DAYPART_HOURS[daypart];
  return `${clockHour(startHour)}–${clockHour(endHour)}`;
}

/** Daypart windows in 12-hour clock, kept in lockstep with `DAYPART_HOURS`. */
export function calendarHoursPhrase(): string {
  return `Mornings land ${clockRange('Morning')}, afternoons ${clockRange('Afternoon')}, evenings ${clockRange('Evening')}`;
}

export function weekEmailCalendarBody(weekStart: string): string {
  return `Open the attached ${icsFilename(weekStart)}. ${calendarHoursPhrase()} — all marked free, so they won't block anything. Or hand the file to your AI assistant and let it fit them around what's already there.`;
}

export function waitlistUrlFromPlan(planUrl: string): string {
  try {
    return new URL('/#waitlist', planUrl).href;
  } catch {
    return 'https://www.heytend.co/#waitlist';
  }
}

function entryLines(entry: WeekEntry, indent: string): string[] {
  const mark = entry.kind === 'room' ? '✦ ' : '';
  const lines = [`${indent}${mark}${entry.label}`];
  const subtitle = entry.focusTitle ?? entry.intention;
  if (subtitle) lines.push(`${indent}  ${subtitle}`);
  return lines;
}

/** Hand-built plain-text part. Reads better than converting the table HTML. */
export function weekEmailText(week: WeekLayout, weekStart: string, planUrl: string): string {
  const parts = ['tend', '', emailWeekRangeLabel(weekStart), '', 'Your week', '', WEEK_EMAIL_INTRO, ''];

  for (const { day, entries } of week.days) {
    parts.push(emailDayLabel(day, weekStart));
    const lanes = emailDayLanes(day, entries);
    if (lanes.length === 0) {
      parts.push(`  ${EMPTY_DAY_LABEL}`);
    } else {
      for (const lane of lanes) {
        parts.push(`  ${lane.label}`);
        parts.push(...lane.entries.flatMap((entry) => entryLines(entry, '    ')));
      }
    }
    parts.push('');
  }

  if (week.unscheduled.length) {
    parts.push('NOT YET SCHEDULED', ...week.unscheduled.flatMap((entry) => entryLines(entry, '  ')), '');
  }

  parts.push(
    'ADD IT TO YOUR CALENDAR',
    weekEmailCalendarBody(weekStart),
    '',
    'CHANGE SOMETHING',
    `Open this week in the planner — it picks up right where you left it.`,
    planUrl,
    '',
    'Tend is still being built. Join the waitlist to follow along.',
    waitlistUrlFromPlan(planUrl),
    '',
    WEEK_EMAIL_ORIGIN,
  );

  return parts.join('\n');
}

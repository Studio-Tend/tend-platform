const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

/**
 * Product decision: the Monday on or after today, where "today" is the
 * calendar date in `timeZone` (not the server's). Planning on Sunday or
 * Monday → that coming Monday / today; Tuesday–Saturday → next Monday.
 */
export function upcomingMonday(now: Date, timeZone: string): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone,
      weekday: 'short',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
      .formatToParts(now)
      .map((part) => [part.type, part.value]),
  );

  const year = Number(parts.year);
  const month = Number(parts.month);
  const day = Number(parts.day);
  const weekday = WEEKDAYS.indexOf(parts.weekday as (typeof WEEKDAYS)[number]);
  const daysUntilMonday = weekday === 0 ? 1 : weekday === 1 ? 0 : 8 - weekday;
  const monday = new Date(Date.UTC(year, month - 1, day + daysUntilMonday));

  return `${monday.getUTCFullYear()}-${pad2(monday.getUTCMonth() + 1)}-${pad2(monday.getUTCDate())}`;
}

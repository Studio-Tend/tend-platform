import { DAYPART_HOURS, DAYS, type Day, type Daypart, type WeekEntry, type WeekLayout } from '@tend/core';
import { fromZonedTime } from 'date-fns-tz';
import ical, { ICalCalendarMethod, ICalEventTransparency } from 'ical-generator';

export interface BuildWeekCalendarInput {
  week: WeekLayout;
  weekStart: string;
  timeZone: string;
}

function civilDateForDay(weekStart: string, day: Day): string {
  const [year, month, date] = weekStart.split('-').map(Number);
  const offset = DAYS.indexOf(day);
  const utc = new Date(Date.UTC(year, month - 1, date + offset));
  return utc.toISOString().slice(0, 10);
}

function zonedInstant(date: string, hour: number, timeZone: string): Date {
  return fromZonedTime(`${date}T${String(hour).padStart(2, '0')}:00:00`, timeZone);
}

function eventDescription(entry: WeekEntry, daypart?: Daypart): string {
  const planned =
    daypart !== undefined ? ` Planned for the ${daypart.toLowerCase()}; move it to a time that works.` : '';
  if (entry.kind === 'room') {
    return `From Tend — making room for this.${planned}`.trim();
  }
  return `From Tend — ${entry.focusTitle ?? 'this week'}.${planned}`.trim();
}

function addTimedEvent(
  calendar: ReturnType<typeof ical>,
  entry: WeekEntry,
  date: string,
  daypart: Daypart,
  timeZone: string,
) {
  const hours = DAYPART_HOURS[daypart];
  calendar.createEvent({
    id: `${entry.id}-${daypart}-${date}@heytend.co`,
    start: zonedInstant(date, hours.startHour, timeZone),
    end: zonedInstant(date, hours.endHour, timeZone),
    summary: entry.kind === 'room' ? `✦ ${entry.label}` : entry.label,
    description: eventDescription(entry, daypart),
    transparency: ICalEventTransparency.TRANSPARENT,
  });
}

function addAllDayEvent(calendar: ReturnType<typeof ical>, entry: WeekEntry, date: string) {
  calendar.createEvent({
    id: `${entry.id}-day-${date}@heytend.co`,
    start: new Date(`${date}T00:00:00Z`),
    allDay: true,
    summary: entry.kind === 'room' ? `✦ ${entry.label}` : entry.label,
    description: eventDescription(entry),
    transparency: ICalEventTransparency.TRANSPARENT,
  });
}

export function buildWeekCalendar({ week, weekStart, timeZone }: BuildWeekCalendarInput): string {
  const calendar = ical({
    name: 'Tend — your week',
    prodId: { company: 'heytend.co', product: 'Tend' },
    method: ICalCalendarMethod.PUBLISH,
  });

  for (const { day, entries } of week.days) {
    const date = civilDateForDay(weekStart, day);
    for (const entry of entries) {
      if (entry.dayparts.length === 0) {
        addAllDayEvent(calendar, entry, date);
        continue;
      }
      for (const daypart of entry.dayparts) {
        addTimedEvent(calendar, entry, date, daypart, timeZone);
      }
    }
  }

  return calendar.toString();
}

import { useEffect, useState } from 'react';
import {
  DAYPARTS,
  DAYS,
  orderedSlots,
  scheduledText,
  toggleSlotDay,
  toggleSlotDaypart,
  type Day,
  type Daypart,
  type ScheduleSlot,
} from '@tend/core';

const DAY_NAME: Record<Day, string> = {
  Mon: 'Monday',
  Tue: 'Tuesday',
  Wed: 'Wednesday',
  Thu: 'Thursday',
  Fri: 'Friday',
  Sat: 'Saturday',
  Sun: 'Sunday',
};

export interface PlannedSlot {
  sourceId: string;
  day: Day;
  daypart: Daypart;
  label: string;
}

interface ScheduleControlProps {
  slots: ScheduleSlot[];
  onChange: (slots: ScheduleSlot[]) => void;
  /** Open the day/time picker on mount (e.g. right after checking an action). */
  defaultOpen?: boolean;
  /**
   * Weekdays that already have something on the week. When set, each day chip
   * shows an occupancy dot. Omit it to leave the chips unmarked.
   */
  busyDays?: ReadonlySet<Day>;
  /**
   * What is already on the week, excluding the row being scheduled. The
   * highlighted day lists these so the choice is made next to them.
   */
  occupied?: readonly PlannedSlot[];
  /** Take one listed placement off that time. Other days on it stay. */
  onUnschedule?: (slot: PlannedSlot) => void;
  /** Row this picker belongs to, so the week glance can mark its day. */
  sourceId?: string;
  /** The highlighted day, or null when the picker is closed. */
  onActiveDayChange?: (day: Day | null, sourceId: string) => void;
}

/**
 * The "+ Add a time" / "Tue · morning, evening ✎" / day+time picker used on
 * both the Prioritize and Make room screens. Days are multi-select and each
 * one keeps its own times: the highlighted day is the one the times below
 * belong to, and every chosen day carries a check. Clicking another chosen
 * day switches to it; clicking the highlighted day again drops it.
 */
export function ScheduleControl({
  slots,
  onChange,
  defaultOpen = false,
  busyDays,
  occupied = [],
  onUnschedule,
  sourceId,
  onActiveDayChange,
}: ScheduleControlProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [currentDay, setCurrentDay] = useState<Day | null>(null);

  const chosen = orderedSlots(slots);
  // Falls back to the first chosen day, so the times below always have an owner.
  const current = chosen.find((s) => s.day === currentDay) ?? chosen[0] ?? null;
  const plannedToday = current
    ? occupied
        .filter((item) => item.day === current.day)
        .slice()
        .sort((a, b) => DAYPARTS.indexOf(a.daypart) - DAYPARTS.indexOf(b.daypart))
    : [];

  useEffect(() => {
    if (!onActiveDayChange || !sourceId) return;
    onActiveDayChange(open ? (current?.day ?? null) : null, sourceId);
    return () => onActiveDayChange(null, sourceId);
  }, [open, current?.day, onActiveDayChange, sourceId]);

  const pickDay = (day: Day) => {
    const alreadyChosen = chosen.some((s) => s.day === day);
    if (!alreadyChosen || current?.day === day) {
      onChange(toggleSlotDay(slots, day));
    }
    setCurrentDay(alreadyChosen && current?.day === day ? null : day);
  };

  if (!open) {
    if (chosen.length === 0) {
      return (
        <button type="button" className="tend-button-ghost tend-time-add" onClick={() => setOpen(true)}>
          + Add a time
        </button>
      );
    }
    return (
      <button type="button" className="tend-scheduled-pill" onClick={() => setOpen(true)}>
        {scheduledText(slots)} ✎
      </button>
    );
  }

  return (
    <div className="tend-scheduler">
      <span className="tend-scheduler__label">Days</span>
      <div className="tend-scheduler__row">
        {DAYS.map((d) => {
          const isChosen = chosen.some((s) => s.day === d);
          const isCurrent = current?.day === d;
          const busy = busyDays?.has(d) ?? false;
          return (
            <button
              key={d}
              type="button"
              aria-pressed={isChosen}
              aria-current={isCurrent ? 'true' : undefined}
              aria-label={busy ? `${d}, something scheduled` : undefined}
              className={`tend-chip${busyDays ? ' tend-chip--day' : ''}${isChosen ? ' tend-chip--chosen' : ''}${isCurrent ? ' tend-chip--selected' : ''}`}
              onClick={() => pickDay(d)}
            >
              <span className="tend-chip__line">
                {d}
                {isChosen && (
                  <span className="tend-chip__check" aria-hidden="true">
                    ✓
                  </span>
                )}
              </span>
              {busyDays && (
                <span
                  className={`tend-chip__dot${busy ? '' : ' tend-chip__dot--empty'}`}
                  aria-hidden="true"
                />
              )}
            </button>
          );
        })}
      </div>

      {current && (
        <>
          <span className="tend-scheduler__label">{current.day} times</span>
          <div className="tend-scheduler__row">
            {DAYPARTS.map((p) => {
              const selected = current.dayparts.includes(p);
              return (
                <button
                  key={p}
                  type="button"
                  aria-pressed={selected}
                  className={`tend-chip${selected ? ' tend-chip--selected' : ''}`}
                  onClick={() => onChange(toggleSlotDaypart(slots, current.day, p))}
                >
                  {p}
                  {selected && (
                    <span className="tend-chip__check" aria-hidden="true">
                      ✓
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          {plannedToday.length > 0 && (
            <div className="tend-scheduler__planned" role="status">
              <div className="tend-scheduler__planned-card">
                <p className="tend-scheduler__planned-label">Already planned for {DAY_NAME[current.day]}</p>
                <ul className="tend-scheduler__planned-items">
                  {plannedToday.map((item) => (
                    <li key={`${item.sourceId}:${item.daypart}`}>
                      <span className="tend-scheduler__planned-plan">
                        <span>{item.label}</span>
                        <span className="tend-scheduler__planned-time">{item.daypart}</span>
                      </span>
                      <button
                        type="button"
                        className="tend-icon-button"
                        aria-label={`Unschedule ${item.label}`}
                        onClick={() => onUnschedule?.(item)}
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
              <p className="tend-scheduler__planned-note">
                It's okay to add another action on this day if it feels right.
              </p>
            </div>
          )}
        </>
      )}

      <button type="button" className="tend-button-ghost" onClick={() => setOpen(false)}>
        Done
      </button>
    </div>
  );
}

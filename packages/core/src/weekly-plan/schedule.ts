import { DAYPARTS, DAYS, type Day, type Daypart, type ScheduleSlot } from './types';

/** "Tue · morning, evening; Thu" / "Tue" / "" */
export function scheduledText(slots: ScheduleSlot[]): string {
  return orderedSlots(slots).map(slotText).join('; ');
}

/** "Tue · morning, evening" / "Tue" */
export function slotText(slot: ScheduleSlot): string {
  if (slot.dayparts.length === 0) return slot.day;
  const times = orderedDayparts(slot.dayparts)
    .map((p) => p.toLowerCase())
    .join(', ');
  return `${slot.day} · ${times}`;
}

/** Adds a day with no time yet, or removes the day along with its times. */
export function toggleSlotDay(slots: ScheduleSlot[], day: Day): ScheduleSlot[] {
  if (slots.some((s) => s.day === day)) {
    return orderedSlots(slots.filter((s) => s.day !== day));
  }
  return orderedSlots([...slots, { day, dayparts: [] }]);
}

/** Adds or removes one time on a day that's already chosen. */
export function toggleSlotDaypart(slots: ScheduleSlot[], day: Day, daypart: Daypart): ScheduleSlot[] {
  return orderedSlots(
    slots.map((s) =>
      s.day !== day
        ? s
        : {
            ...s,
            dayparts: s.dayparts.includes(daypart)
              ? s.dayparts.filter((p) => p !== daypart)
              : orderedDayparts([...s.dayparts, daypart]),
          }
    )
  );
}

export function orderedSlots(slots: ScheduleSlot[]): ScheduleSlot[] {
  return DAYS.flatMap((day) => slots.filter((s) => s.day === day));
}

export function orderedDayparts(dayparts: Daypart[]): Daypart[] {
  return DAYPARTS.filter((p) => dayparts.includes(p));
}

/** Removes one day/time placement. An empty day is dropped. */
export function removeSlotPlacement(
  slots: ScheduleSlot[],
  day: Day,
  daypart: Daypart | null,
): ScheduleSlot[] {
  return orderedSlots(
    slots.flatMap((slot) => {
      if (slot.day !== day) return [slot];
      if (daypart === null) {
        return slot.dayparts.length === 0 ? [] : [slot];
      }
      const dayparts = slot.dayparts.filter((part) => part !== daypart);
      return dayparts.length === 0 ? [] : [{ ...slot, dayparts }];
    }),
  );
}

/** Adds a day, or a time on a day that's already chosen. */
export function addSlotPlacement(
  slots: ScheduleSlot[],
  day: Day,
  daypart: Daypart | null,
): ScheduleSlot[] {
  const existing = slots.find((slot) => slot.day === day);
  if (!existing) {
    return orderedSlots([...slots, { day, dayparts: daypart ? [daypart] : [] }]);
  }
  if (daypart === null || existing.dayparts.includes(daypart)) {
    return orderedSlots(slots);
  }
  return orderedSlots(
    slots.map((slot) =>
      slot.day === day ? { ...slot, dayparts: orderedDayparts([...slot.dayparts, daypart]) } : slot,
    ),
  );
}

/**
 * Moves one day/time onto another. Same place is a no-op so callers can
 * reorder without touching slots.
 */
export function moveSlotPlacement(
  slots: ScheduleSlot[],
  from: { day: Day | null; daypart: Daypart | null },
  to: { day: Day | null; daypart: Daypart | null },
): ScheduleSlot[] {
  if (from.day === to.day && from.daypart === to.daypart) {
    return orderedSlots(slots);
  }
  let next = slots;
  if (from.day) {
    next = removeSlotPlacement(next, from.day, from.daypart);
  }
  if (to.day) {
    next = addSlotPlacement(next, to.day, to.daypart);
  }
  return next;
}

import {
  layoutWeekBoard,
  moveWeekPlacement,
  type Day,
  type Daypart,
  type Focus,
  type RoomItem,
} from '@tend/core';

/** Weekdays that already have a checked action or make-room item, matching the week board. */
export function busyDaysFrom(focuses: Focus[], roomItems: RoomItem[]): ReadonlySet<Day> {
  return new Set(
    layoutWeekBoard(focuses, roomItems)
      .days.filter((column) => column.lanes.some((lane) => lane.items.length > 0))
      .map((column) => column.day),
  );
}

/** One checked action or make-room item already sitting in a day and time. */
export interface OccupiedSlot {
  sourceId: string;
  day: Day;
  daypart: Daypart;
  label: string;
}

/** Timed placements on the week board. Untimed days and blank labels are left out. */
export function occupiedSlots(focuses: Focus[], roomItems: RoomItem[]): OccupiedSlot[] {
  return layoutWeekBoard(focuses, roomItems).days.flatMap((column) =>
    column.lanes.flatMap((lane) => {
      const daypart = lane.daypart;
      if (!daypart) return [];
      return lane.items
        .filter((item) => item.label.trim() !== '')
        .map((item) => ({
          sourceId: item.sourceId,
          day: column.day,
          daypart,
          label: item.label,
        }));
    }),
  );
}

/**
 * Takes one day and time off the week, the same move as dropping that card on
 * Unscheduled. Other days stay. Checked is left alone, so a last time becomes
 * unscheduled and still selected.
 */
export function unschedulePlacement(
  focuses: Focus[],
  roomItems: RoomItem[],
  slot: Pick<OccupiedSlot, 'sourceId' | 'day' | 'daypart'>,
): { focuses: Focus[]; roomItems: RoomItem[] } {
  const index = layoutWeekBoard(focuses, roomItems).unscheduled.length;
  return moveWeekPlacement(
    focuses,
    roomItems,
    { sourceId: slot.sourceId, day: slot.day, daypart: slot.daypart },
    { day: null, daypart: null, index },
  );
}

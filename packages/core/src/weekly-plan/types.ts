export type Day = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';
export type Daypart = 'Morning' | 'Afternoon' | 'Evening';

export const DAYS: Day[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const DAYPARTS: Daypart[] = ['Morning', 'Afternoon', 'Evening'];

/** Hard cap. The focuses step starts at three, allows six, and asks the seventh to wait. */
export const MAX_FOCUSES = 6;

/** Shared cap for action and make-room labels (and focus titles on the wire). */
export const LABEL_MAX = 200;

/**
 * Product decision: what each daypart means as a timed calendar block.
 * Kept next to the daypart union so the mapping can't drift from the names.
 */
export const DAYPART_HOURS: Record<Daypart, { startHour: number; endHour: number }> = {
  Morning: { startHour: 9, endHour: 12 },
  Afternoon: { startHour: 13, endHour: 17 },
  Evening: { startHour: 18, endHour: 21 },
};

/** One chosen weekday, with the times chosen for that day. Times stay optional. */
export interface ScheduleSlot {
  day: Day;
  dayparts: Daypart[];
}

export interface ActionItem {
  id: string;
  label: string;
  checked: boolean;
  slots: ScheduleSlot[];
  /** Hand-sorted position per lane, keyed by `laneKey`. Lower comes first. */
  laneOrders?: Record<string, number> | undefined;
}

export interface Focus {
  id: string;
  title: string;
  actions: ActionItem[];
  /**
   * Index into the focus palette (`focusPalette` in `@tend/ui-tokens`).
   * Assigned once so reordering focuses does not change a focus's color.
   */
  colorIndex?: number | undefined;
}

export interface RoomItem {
  id: string;
  label: string;
  slots: ScheduleSlot[];
  /**
   * What this would bring into the week. Optional, and shown under the item
   * the same way a goal name sits under an action.
   */
  intention?: string | undefined;
  /** Hand-sorted position per lane, keyed by `laneKey`. Lower comes first. */
  laneOrders?: Record<string, number> | undefined;
}

import { addSlotPlacement, moveSlotPlacement, orderedDayparts, orderedSlots, removeSlotPlacement } from './schedule';
import { DAYS, DAYPARTS, type Day, type Daypart, type Focus, type RoomItem, type ScheduleSlot } from './types';

export interface WeekEntry {
  id: string;
  sourceId: string;
  label: string;
  day: Day | null;
  dayparts: Daypart[];
  kind: 'task' | 'room';
  focusTitle?: string | undefined;
  /** Make-room phrase, shown the same way `focusTitle` is for an action. */
  intention?: string | undefined;
  /** Position the plan was built in, used for anything never sorted by hand. */
  sequence: number;
  laneOrders?: Record<string, number> | undefined;
}

export interface WeekLayout {
  days: { day: Day; entries: WeekEntry[] }[];
  unscheduled: WeekEntry[];
}

/** One card on the week board: a source item in one day and one time of day. */
export interface WeekPlacement {
  key: string;
  sourceId: string;
  label: string;
  kind: 'task' | 'room';
  focusTitle?: string | undefined;
  intention?: string | undefined;
  day: Day | null;
  daypart: Daypart | null;
  order: number;
}

export interface WeekLane {
  daypart: Daypart | null;
  items: WeekPlacement[];
}

export interface WeekBoard {
  days: { day: Day; lanes: WeekLane[] }[];
  unscheduled: WeekPlacement[];
}

export function countSelected(focuses: Focus[]): number {
  return focuses.reduce((sum, f) => sum + f.actions.filter((a) => a.checked).length, 0);
}

/**
 * Identifies one lane on the board. Sort positions are recorded per lane, so
 * an item scheduled on two days can sit first on one and last on the other.
 */
export function laneKey(day: Day | null, daypart: Daypart | null): string {
  if (!day) return 'unscheduled';
  return `${day}:${daypart ?? 'anytime'}`;
}

/**
 * Hand-sorted positions are 0-based within their lane, so anything never
 * sorted has to land after them. This base sits past any reachable lane
 * length, which keeps the comparison a single integer rather than a tuple.
 */
const UNSORTED_BASE = 10_000;

function laneOrderOf(entry: WeekEntry, key: string): number {
  return entry.laneOrders?.[key] ?? UNSORTED_BASE + entry.sequence;
}

/** One entry per chosen day, so something scheduled twice a week shows up twice. */
function entriesFor(
  item: {
    id: string;
    label: string;
    slots: ScheduleSlot[];
    intention?: string | undefined;
    laneOrders?: Record<string, number> | undefined;
  },
  kind: WeekEntry['kind'],
  sequence: number,
  focusTitle?: string | undefined,
): WeekEntry[] {
  const { id, label, laneOrders, intention } = item;
  const shared = {
    sourceId: id,
    label,
    kind,
    sequence,
    laneOrders,
    ...(focusTitle !== undefined ? { focusTitle } : {}),
    ...(intention ? { intention } : {}),
  };
  if (item.slots.length === 0) {
    return [{ id, day: null, dayparts: [], ...shared }];
  }
  return orderedSlots(item.slots).map((slot) => ({
    id: `${id}:${slot.day}`,
    day: slot.day,
    dayparts: orderedDayparts(slot.dayparts),
    ...shared,
  }));
}

/** Selected actions plus make-room items, flattened into one list. */
export function buildWeekEntries(focuses: Focus[], roomItems: RoomItem[]): WeekEntry[] {
  let sequence = 0;
  const tasks = focuses.flatMap((focus) =>
    focus.actions
      .filter((a) => a.checked)
      .flatMap((a) => entriesFor(a, 'task', sequence++, focus.title))
  );
  const room = roomItems.flatMap((r) => entriesFor(r, 'room', sequence++));
  return [...tasks, ...room];
}

/** Morning first, then afternoon, evening, then anything without a daypart. */
function daypartRank(entry: WeekEntry): number {
  const first = entry.dayparts[0];
  return first ? DAYPARTS.indexOf(first) : DAYPARTS.length;
}

function byBoardOrder(a: { order: number }, b: { order: number }): number {
  return a.order - b.order;
}

/** Groups entries by weekday in order (all seven days). Undated entries go to `unscheduled`. */
export function layoutWeek(focuses: Focus[], roomItems: RoomItem[]): WeekLayout {
  const entries = buildWeekEntries(focuses, roomItems);
  return {
    days: DAYS.map((day) => ({
      day,
      entries: entries
        .filter((e) => e.day === day)
        .sort((a, b) => {
          const part = daypartRank(a) - daypartRank(b);
          if (part !== 0) return part;
          // Equal rank means the same leading daypart, so one lane key fits both.
          const key = laneKey(day, a.dayparts[0] ?? null);
          return laneOrderOf(a, key) - laneOrderOf(b, key);
        }),
    })),
    unscheduled: entries
      .filter((e) => !e.day)
      .sort((a, b) => laneOrderOf(a, laneKey(null, null)) - laneOrderOf(b, laneKey(null, null))),
  };
}

/** Stable DOM/React key for one card, so callers can find it again after a move. */
export function placementKey(sourceId: string, day: Day | null, daypart: Daypart | null): string {
  return `${sourceId}:${laneKey(day, daypart)}`;
}

function toPlacement(entry: WeekEntry, daypart: Daypart | null): WeekPlacement {
  return {
    key: placementKey(entry.sourceId, entry.day, daypart),
    sourceId: entry.sourceId,
    label: entry.label,
    kind: entry.kind,
    focusTitle: entry.focusTitle,
    intention: entry.intention,
    day: entry.day,
    daypart,
    order: laneOrderOf(entry, laneKey(entry.day, daypart)),
  };
}

/**
 * Same week as `layoutWeek`, split so an item with morning + evening appears
 * in both lanes. Empty "anytime" lanes are omitted.
 */
export function layoutWeekBoard(focuses: Focus[], roomItems: RoomItem[]): WeekBoard {
  const { days, unscheduled } = layoutWeek(focuses, roomItems);
  return {
    days: days.map(({ day, entries }) => {
      const timed: WeekLane[] = DAYPARTS.map((daypart) => ({
        daypart,
        items: entries
          .filter((entry) => entry.dayparts.includes(daypart))
          .map((entry) => toPlacement(entry, daypart))
          .sort(byBoardOrder),
      }));
      const anytime = entries
        .filter((entry) => entry.dayparts.length === 0)
        .map((entry) => toPlacement(entry, null))
        .sort(byBoardOrder);
      return {
        day,
        lanes: anytime.length > 0 ? [...timed, { daypart: null, items: anytime }] : timed,
      };
    }),
    unscheduled: unscheduled.map((entry) => toPlacement(entry, null)),
  };
}

export function laneItems(board: WeekBoard, day: Day | null, daypart: Daypart | null): WeekPlacement[] {
  if (!day) return board.unscheduled;
  const column = board.days.find((entry) => entry.day === day);
  return column?.lanes.find((lane) => lane.daypart === daypart)?.items ?? [];
}

/**
 * Insertion index in a lane after the moving item has been taken out of that
 * lane. `beforeSourceId` places it before that neighbor; omit it to append.
 */
export function laneInsertionIndex(
  items: { sourceId: string }[],
  movingSourceId: string,
  alreadyInLane: boolean,
  beforeSourceId?: string | null,
): number {
  const without = alreadyInLane ? items.filter((item) => item.sourceId !== movingSourceId) : items;
  if (!beforeSourceId) return without.length;
  const index = without.findIndex((item) => item.sourceId === beforeSourceId);
  return index === -1 ? without.length : index;
}

/** Fields of an action or make-room item that a board move is allowed to touch. */
type PlanItemEdit = { slots: ScheduleSlot[]; laneOrders?: Record<string, number> | undefined };

function updatePlanItem(
  focuses: Focus[],
  roomItems: RoomItem[],
  sourceId: string,
  update: (item: PlanItemEdit) => PlanItemEdit,
): { focuses: Focus[]; roomItems: RoomItem[] } {
  let found = false;
  const nextFocuses = focuses.map((focus) => ({
    ...focus,
    actions: focus.actions.map((action) => {
      if (action.id !== sourceId) return action;
      found = true;
      return { ...action, ...update(action) };
    }),
  }));
  if (found) return { focuses: nextFocuses, roomItems };
  return {
    focuses,
    roomItems: roomItems.map((item) => (item.id === sourceId ? { ...item, ...update(item) } : item)),
  };
}

function withoutLane(
  laneOrders: Record<string, number> | undefined,
  key: string,
): Record<string, number> | undefined {
  if (!laneOrders || laneOrders[key] === undefined) return laneOrders;
  const { [key]: _gone, ...rest } = laneOrders;
  return rest;
}

/** Records everyone's position in one lane, leaving every other lane alone. */
function applyLaneOrders(
  focuses: Focus[],
  roomItems: RoomItem[],
  key: string,
  orderedSourceIds: string[],
): { focuses: Focus[]; roomItems: RoomItem[] } {
  const orders = new Map(orderedSourceIds.map((id, index) => [id, index]));
  const positioned = <T extends { id: string; laneOrders?: Record<string, number> | undefined }>(item: T): T => {
    const position = orders.get(item.id);
    if (position === undefined) return item;
    return { ...item, laneOrders: { ...item.laneOrders, [key]: position } };
  };
  return {
    focuses: focuses.map((focus) => ({ ...focus, actions: focus.actions.map(positioned) })),
    roomItems: roomItems.map(positioned),
  };
}

export interface WeekPlacementRef {
  sourceId: string;
  day: Day | null;
  daypart: Daypart | null;
}

/**
 * Moves one board card to another day/time (or unscheduled) and records sort
 * order for everyone in the destination lane. `to.index` is clamped, so
 * callers can pass a length they haven't measured.
 */
export function moveWeekPlacement(
  focuses: Focus[],
  roomItems: RoomItem[],
  from: WeekPlacementRef,
  to: { day: Day | null; daypart: Daypart | null; index: number },
): { focuses: Focus[]; roomItems: RoomItem[] } {
  const alreadyInLane = from.day === to.day && from.daypart === to.daypart;
  const current = laneItems(layoutWeekBoard(focuses, roomItems), to.day, to.daypart);
  const without = alreadyInLane ? current.filter((item) => item.sourceId !== from.sourceId) : current;
  const index = Math.max(0, Math.min(to.index, without.length));
  const orderedSourceIds = [...without.map((item) => item.sourceId)];
  orderedSourceIds.splice(index, 0, from.sourceId);

  const moved = updatePlanItem(focuses, roomItems, from.sourceId, (item) => ({
    ...item,
    slots: moveSlotPlacement(item.slots, from, to),
    // The card is leaving its old lane, so it shouldn't keep a position there.
    ...(alreadyInLane ? {} : { laneOrders: withoutLane(item.laneOrders, laneKey(from.day, from.daypart)) }),
  }));

  return applyLaneOrders(moved.focuses, moved.roomItems, laneKey(to.day, to.daypart), orderedSourceIds);
}

/** Adds an undated twin of `sourceId` right after it, so both read in order. */
function duplicateAsUnscheduled(
  focuses: Focus[],
  roomItems: RoomItem[],
  sourceId: string,
  newId: string,
): { focuses: Focus[]; roomItems: RoomItem[] } | null {
  let found = false;
  const nextFocuses = focuses.map((focus) => ({
    ...focus,
    actions: focus.actions.flatMap((action) => {
      if (action.id !== sourceId) return [action];
      found = true;
      return [action, { ...action, id: newId, checked: true, slots: [], laneOrders: undefined }];
    }),
  }));
  if (found) return { focuses: nextFocuses, roomItems };

  if (!roomItems.some((item) => item.id === sourceId)) return null;
  return {
    focuses,
    roomItems: roomItems.flatMap((item) =>
      item.id === sourceId ? [item, { ...item, id: newId, slots: [], laneOrders: undefined }] : [item],
    ),
  };
}

/**
 * Adds a second board card for the same item, leaving the original in place.
 * Copying from unscheduled, or onto a lane that already has this item, is a
 * no-op — the model can only show one card per source per lane.
 *
 * An item is unscheduled precisely when it has no day, so the same source
 * can't be both dated and undated. Copying into unscheduled therefore needs
 * `newId` and makes a separate, independent item with the same label.
 */
export function copyWeekPlacement(
  focuses: Focus[],
  roomItems: RoomItem[],
  from: WeekPlacementRef,
  to: { day: Day | null; daypart: Daypart | null; index: number },
  newId?: string,
): { focuses: Focus[]; roomItems: RoomItem[] } {
  const day = to.day;
  if (!from.day) return { focuses, roomItems };

  if (!day) {
    if (!newId) return { focuses, roomItems };
    const duplicated = duplicateAsUnscheduled(focuses, roomItems, from.sourceId, newId);
    if (!duplicated) return { focuses, roomItems };

    const lane = laneItems(layoutWeekBoard(focuses, roomItems), null, null);
    const orderedSourceIds = lane.map((item) => item.sourceId);
    orderedSourceIds.splice(Math.max(0, Math.min(to.index, lane.length)), 0, newId);
    return applyLaneOrders(duplicated.focuses, duplicated.roomItems, laneKey(null, null), orderedSourceIds);
  }

  if (from.day === day && from.daypart === to.daypart) return { focuses, roomItems };

  const current = laneItems(layoutWeekBoard(focuses, roomItems), day, to.daypart);
  if (current.some((item) => item.sourceId === from.sourceId)) return { focuses, roomItems };

  const index = Math.max(0, Math.min(to.index, current.length));
  const orderedSourceIds = [...current.map((item) => item.sourceId)];
  orderedSourceIds.splice(index, 0, from.sourceId);

  const copied = updatePlanItem(focuses, roomItems, from.sourceId, (item) => ({
    ...item,
    slots: addSlotPlacement(item.slots, day, to.daypart),
  }));

  return applyLaneOrders(copied.focuses, copied.roomItems, laneKey(day, to.daypart), orderedSourceIds);
}

function dropFromWeek(
  focuses: Focus[],
  roomItems: RoomItem[],
  sourceId: string,
): { focuses: Focus[]; roomItems: RoomItem[] } {
  let found = false;
  const nextFocuses = focuses.map((focus) => ({
    ...focus,
    actions: focus.actions.map((action) => {
      if (action.id !== sourceId) return action;
      found = true;
      return { ...action, checked: false, slots: [], laneOrders: undefined };
    }),
  }));
  if (found) return { focuses: nextFocuses, roomItems };
  return { focuses, roomItems: roomItems.filter((item) => item.id !== sourceId) };
}

/**
 * Removes one board card. Other days for the same item stay put. The last
 * placement (or an unscheduled card) leaves the week: actions are unchecked,
 * make-room items are dropped.
 */
export function removeWeekPlacement(
  focuses: Focus[],
  roomItems: RoomItem[],
  from: WeekPlacementRef,
): { focuses: Focus[]; roomItems: RoomItem[] } {
  if (!from.day) return dropFromWeek(focuses, roomItems, from.sourceId);

  const current = [...focuses.flatMap((focus) => focus.actions), ...roomItems].find((item) => item.id === from.sourceId);
  if (!current) return { focuses, roomItems };

  const nextSlots = removeSlotPlacement(current.slots, from.day, from.daypart);
  if (nextSlots.length === 0) return dropFromWeek(focuses, roomItems, from.sourceId);

  return updatePlanItem(focuses, roomItems, from.sourceId, (item) => ({
    ...item,
    slots: nextSlots,
    laneOrders: withoutLane(item.laneOrders, laneKey(from.day, from.daypart)),
  }));
}


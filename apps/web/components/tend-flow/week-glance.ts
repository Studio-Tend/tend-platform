import {
  assignFocusColors,
  DAYPARTS,
  DAYS,
  orderedDayparts,
  orderedSlots,
  type Day,
  type Daypart,
  type Focus,
  type RoomItem,
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

const GROUP_ORDER: (Daypart | null)[] = [...DAYPARTS, null];

export interface GlancePlan {
  key: string;
  sourceId: string;
  label: string;
  day: Day;
  daypart: Daypart | null;
  focusId: string | null;
  focusTitle: string | null;
  colorIndex: number | null;
}

export interface GlanceGroup {
  daypart: Daypart | null;
  label: string;
  plans: GlancePlan[];
}

export interface GlanceDay {
  day: Day;
  title: string;
  groups: GlanceGroup[];
  empty: boolean;
}

export interface WeekGlanceModel {
  days: GlanceDay[];
  plans: GlancePlan[];
  planCount: number;
}

export function dayName(day: Day): string {
  return DAY_NAME[day];
}

export function planCountLabel(count: number): string {
  return count === 1 ? '1 plan' : `${count} plans`;
}

/** Collapsed mobile summary, for example "4 days planned · 5 actions". */
export function glanceSummary(glance: WeekGlanceModel): string | null {
  if (glance.planCount === 0) return null;
  const days = glance.days.filter((day) => !day.empty).length;
  const dayLabel = days === 1 ? '1 day planned' : `${days} days planned`;
  const actionLabel = glance.planCount === 1 ? '1 action' : `${glance.planCount} actions`;
  return `${dayLabel} · ${actionLabel}`;
}

/** "Already planned for Wednesday evening" */
export function alreadyPlannedHeading(day: Day, daypart: Daypart): string {
  return `Already planned for ${DAY_NAME[day]} ${daypart.toLowerCase()}`;
}

export function otherPlansAt(
  plans: GlancePlan[],
  day: Day,
  daypart: Daypart,
  sourceId: string,
): GlancePlan[] {
  return plans.filter((plan) => plan.day === day && plan.daypart === daypart && plan.sourceId !== sourceId);
}

function groupLabel(daypart: Daypart | null): string {
  return daypart ?? 'Anytime';
}

function placementsFor(
  source: {
    sourceId: string;
    label: string;
    slots: ScheduleSlot[];
    focusId: string | null;
    focusTitle: string | null;
    colorIndex: number | null;
  },
): GlancePlan[] {
  const plans: GlancePlan[] = [];
  for (const slot of orderedSlots(source.slots)) {
    const dayparts = orderedDayparts(slot.dayparts);
    const parts: (Daypart | null)[] = dayparts.length === 0 ? [null] : dayparts;
    for (const daypart of parts) {
      plans.push({
        key: `${source.sourceId}:${slot.day}:${daypart ?? 'anytime'}`,
        sourceId: source.sourceId,
        label: source.label,
        day: slot.day,
        daypart,
        focusId: source.focusId,
        focusTitle: source.focusTitle,
        colorIndex: source.colorIndex,
      });
    }
  }
  return plans;
}

/**
 * Monday–Sunday from the live plan. Checked actions and make-room items
 * appear once per day and daypart they are assigned to. Unchecked actions
 * and anything without a day are left out.
 */
export function weekGlance(focuses: Focus[], roomItems: RoomItem[]): WeekGlanceModel {
  const colored = assignFocusColors(focuses);
  const plans: GlancePlan[] = [];

  for (const focus of colored) {
    for (const action of focus.actions) {
      if (!action.checked || action.slots.length === 0) continue;
      plans.push(
        ...placementsFor({
          sourceId: action.id,
          label: action.label,
          slots: action.slots,
          focusId: focus.id,
          focusTitle: focus.title,
          colorIndex: focus.colorIndex ?? null,
        }),
      );
    }
  }

  for (const item of roomItems) {
    if (item.slots.length === 0) continue;
    plans.push(
      ...placementsFor({
        sourceId: item.id,
        label: item.label,
        slots: item.slots,
        focusId: null,
        focusTitle: null,
        colorIndex: null,
      }),
    );
  }

  const days: GlanceDay[] = DAYS.map((day) => {
    const onDay = plans.filter((plan) => plan.day === day);
    const groups: GlanceGroup[] = GROUP_ORDER.flatMap((daypart) => {
      const inGroup = onDay.filter((plan) => plan.daypart === daypart);
      if (inGroup.length === 0) return [];
      return [{ daypart, label: groupLabel(daypart), plans: inGroup }];
    });
    return { day, title: DAY_NAME[day], groups, empty: groups.length === 0 };
  });

  return { days, plans, planCount: plans.length };
}

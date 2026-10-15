import type { PlanState } from '@tend/core';

/**
 * A filled week for local testing. Loaded only by the dev server so a refresh
 * opens Your week instead of an empty planner. Add `?empty` to skip it.
 */
export function mockWeekPlan(): PlanState {
  return {
    focuses: [
      {
        id: 'job',
        title: 'Career development',
        actions: [
          {
            id: 'portfolio',
            label: 'Finish portfolio case study',
            checked: true,
            slots: [{ day: 'Tue', dayparts: ['Afternoon'] }],
          },
          {
            id: 'outline',
            label: 'Sketch the case study outline',
            checked: true,
            slots: [{ day: 'Tue', dayparts: ['Afternoon'] }],
          },
          {
            id: 'sarah',
            label: 'Reach out to Sarah',
            checked: true,
            slots: [{ day: 'Wed', dayparts: ['Morning'] }],
          },
          {
            id: 'apply',
            label: 'Apply to two strong-fit roles',
            checked: true,
            slots: [{ day: 'Thu', dayparts: ['Afternoon'] }],
          },
          {
            id: 'interview',
            label: 'Practice a system design interview',
            checked: true,
            slots: [],
          },
          {
            id: 'linkedin',
            label: 'Update LinkedIn headline',
            checked: false,
            slots: [],
          },
        ],
      },
      {
        id: 'strength',
        title: 'Get stronger',
        actions: [
          {
            id: 'training',
            label: 'Strength training',
            checked: true,
            slots: [
              { day: 'Mon', dayparts: ['Evening'] },
              { day: 'Thu', dayparts: ['Morning'] },
              { day: 'Sat', dayparts: ['Morning'] },
            ],
          },
          {
            id: 'yoga',
            label: 'Go to yoga',
            checked: true,
            slots: [{ day: 'Wed', dayparts: ['Evening'] }],
          },
        ],
      },
      {
        id: 'family',
        title: 'Spend time with family',
        actions: [
          {
            id: 'lunch',
            label: 'Sunday lunch',
            checked: true,
            slots: [{ day: 'Sun', dayparts: ['Afternoon'] }],
          },
          {
            id: 'mom',
            label: 'Call mom',
            checked: true,
            slots: [{ day: 'Sun', dayparts: ['Morning'] }],
          },
          {
            id: 'games',
            label: 'Family game night',
            checked: true,
            slots: [{ day: 'Fri', dayparts: ['Evening'] }],
          },
        ],
      },
    ],
    roomItems: [
      { id: 'beach', label: 'Beach walk', slots: [{ day: 'Sat', dayparts: ['Afternoon'] }] },
      { id: 'dinner', label: 'Dinner with friends', slots: [{ day: 'Fri', dayparts: ['Evening'] }] },
      { id: 'read', label: 'Read on the couch', slots: [{ day: 'Tue', dayparts: ['Evening'] }] },
      { id: 'open', label: 'Nothing planned', slots: [] },
    ],
  };
}

/** True on the local dev server, unless the page was opened with `?empty`. */
export function shouldLoadDevMock(nodeEnv: string | undefined, search: string): boolean {
  if (nodeEnv !== 'development') return false;
  return !new URLSearchParams(search).has('empty');
}

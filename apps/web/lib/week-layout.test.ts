import { describe, expect, it } from 'vitest';
import {
  PlanStateSchema,
  copyWeekPlacement,
  laneInsertionIndex,
  layoutWeek,
  layoutWeekBoard,
  moveSlotPlacement,
  moveWeekPlacement,
  removeWeekPlacement,
  toggleSlotDay,
  toggleSlotDaypart,
  type Focus,
  type RoomItem,
} from '@tend/core';

const focuses: Focus[] = [
  {
    id: 'job',
    title: 'Career development',
    actions: [
      { id: 'a1', label: 'Finish case study', checked: true, slots: [{ day: 'Tue', dayparts: ['Afternoon'] }] },
      { id: 'a2', label: 'Reach out to Sarah', checked: true, slots: [] },
      { id: 'a3', label: 'Skip this', checked: false, slots: [{ day: 'Mon', dayparts: ['Morning'] }] },
    ],
  },
];

const roomItems: RoomItem[] = [
  { id: 'r1', label: 'Beach walk', slots: [] },
  { id: 'r2', label: 'Dinner', slots: [{ day: 'Fri', dayparts: ['Evening'] }] },
];

describe('layoutWeek', () => {
  it('places checked scheduled work on those days and skips unchecked actions', () => {
    const { days, unscheduled } = layoutWeek(focuses, roomItems);
    const tue = days.find((d) => d.day === 'Tue')?.entries.map((e) => e.label);
    const fri = days.find((d) => d.day === 'Fri')?.entries.map((e) => e.label);
    const mon = days.find((d) => d.day === 'Mon')?.entries.map((e) => e.label);

    expect(tue).toContain('Finish case study');
    expect(fri).toContain('Dinner');
    expect(mon).not.toContain('Skip this');
    expect(unscheduled.map((e) => e.label)).toEqual(['Reach out to Sarah', 'Beach walk']);
  });

  it('puts a room intention on each placement and leaves action goals alone', () => {
    const withIntention: RoomItem[] = [
      { id: 'r1', label: 'Beach walk', intention: 'Rest & recovery', slots: [] },
      { id: 'r2', label: 'Dinner', intention: 'Connection', slots: [{ day: 'Fri', dayparts: ['Evening'] }] },
    ];
    const { days, unscheduled } = layoutWeek(focuses, withIntention);
    const dinner = days.find((d) => d.day === 'Fri')?.entries.find((entry) => entry.label === 'Dinner');
    const study = days.find((d) => d.day === 'Tue')?.entries.find((entry) => entry.label === 'Finish case study');

    expect(dinner).toMatchObject({ kind: 'room', intention: 'Connection' });
    expect(dinner?.focusTitle).toBeUndefined();
    expect(unscheduled.find((entry) => entry.label === 'Beach walk')?.intention).toBe('Rest & recovery');
    expect(study?.focusTitle).toBe('Career development');
    expect(study?.intention).toBeUndefined();

    const card = layoutWeekBoard(focuses, withIntention)
      .days.find((day) => day.day === 'Fri')
      ?.lanes.find((lane) => lane.daypart === 'Evening')?.items[0];
    expect(card).toMatchObject({ label: 'Dinner', intention: 'Connection' });
    expect(card?.focusTitle).toBeUndefined();
  });

  it('accepts a room item with and without an intention', () => {
    const bare = { id: 'r1', label: 'Dinner', slots: [] as RoomItem['slots'] };
    expect(PlanStateSchema.parse({ focuses: [], roomItems: [bare] }).roomItems[0]?.intention).toBeUndefined();
    expect(
      PlanStateSchema.parse({ focuses: [], roomItems: [{ ...bare, intention: '  Connection  ' }] }).roomItems[0]
        ?.intention,
    ).toBe('Connection');
  });

  it('lists morning before afternoon on the same day, even when the afternoon action was chosen first', () => {
    const mixed: Focus[] = [
      {
        id: 'job',
        title: 'Job Search',
        actions: [
          {
            id: 'a1',
            label: 'Send job applications',
            checked: true,
            slots: [{ day: 'Mon', dayparts: ['Afternoon'] }],
          },
          {
            id: 'a2',
            label: 'Study',
            checked: true,
            slots: [{ day: 'Mon', dayparts: ['Morning'] }],
          },
        ],
      },
    ];

    const mon = layoutWeek(mixed, []).days.find((d) => d.day === 'Mon')?.entries.map((e) => e.label);
    expect(mon).toEqual(['Study', 'Send job applications']);
  });

  it('keeps a hand-sorted order inside the same daypart', () => {
    const ordered: Focus[] = [
      {
        id: 'job',
        title: 'Job',
        actions: [
          {
            id: 'a1',
            label: 'Second',
            checked: true,
            laneOrders: { 'Mon:Morning': 1 },
            slots: [{ day: 'Mon', dayparts: ['Morning'] }],
          },
          {
            id: 'a2',
            label: 'First',
            checked: true,
            laneOrders: { 'Mon:Morning': 0 },
            slots: [{ day: 'Mon', dayparts: ['Morning'] }],
          },
        ],
      },
    ];

    const mon = layoutWeek(ordered, []).days.find((d) => d.day === 'Mon')?.entries.map((e) => e.label);
    expect(mon).toEqual(['First', 'Second']);
  });
});

describe('layoutWeekBoard', () => {
  it('shows a multi-time item in each of its dayparts', () => {
    const strength: Focus[] = [
      {
        id: 'body',
        title: 'Get stronger',
        actions: [
          {
            id: 'a7',
            label: 'Strength training',
            checked: true,
            slots: [{ day: 'Thu', dayparts: ['Morning', 'Evening'] }],
          },
        ],
      },
    ];

    const thu = layoutWeekBoard(strength, []).days.find((d) => d.day === 'Thu');
    const labels = (daypart: 'Morning' | 'Evening') =>
      thu?.lanes.find((lane) => lane.daypart === daypart)?.items.map((item) => item.label);

    expect(labels('Morning')).toEqual(['Strength training']);
    expect(labels('Evening')).toEqual(['Strength training']);
  });
});

describe('laneInsertionIndex', () => {
  const items = [{ sourceId: 'a' }, { sourceId: 'b' }, { sourceId: 'c' }];

  it('inserts before a neighbor after the moving item has left the lane', () => {
    expect(laneInsertionIndex(items, 'a', true, 'c')).toBe(1);
    expect(laneInsertionIndex(items, 'b', false, 'c')).toBe(2);
  });

  it('appends when no neighbor is given', () => {
    expect(laneInsertionIndex(items, 'a', true)).toBe(2);
    expect(laneInsertionIndex(items, 'x', false)).toBe(3);
  });
});

describe('moveSlotPlacement', () => {
  it('replaces one time of day with another on the same day', () => {
    const slots = [{ day: 'Mon' as const, dayparts: ['Morning' as const] }];
    expect(moveSlotPlacement(slots, { day: 'Mon', daypart: 'Morning' }, { day: 'Mon', daypart: 'Afternoon' })).toEqual([
      { day: 'Mon', dayparts: ['Afternoon'] },
    ]);
  });

  it('moves only one time when the day holds two', () => {
    const slots = [{ day: 'Thu' as const, dayparts: ['Morning' as const, 'Evening' as const] }];
    expect(
      moveSlotPlacement(slots, { day: 'Thu', daypart: 'Morning' }, { day: 'Thu', daypart: 'Afternoon' }),
    ).toEqual([{ day: 'Thu', dayparts: ['Afternoon', 'Evening'] }]);
  });
});

describe('moveWeekPlacement', () => {
  const morningStudy: Focus[] = [
    {
      id: 'job',
      title: 'Job',
      actions: [
        { id: 'study', label: 'Study', checked: true, slots: [{ day: 'Mon', dayparts: ['Morning'] }] },
        { id: 'run', label: 'Run', checked: true, slots: [{ day: 'Mon', dayparts: ['Morning'] }] },
      ],
    },
  ];

  it('moves study from morning to afternoon', () => {
    const next = moveWeekPlacement(
      morningStudy,
      [],
      { sourceId: 'study', day: 'Mon', daypart: 'Morning' },
      { day: 'Mon', daypart: 'Afternoon', index: 0 },
    );
    const board = layoutWeekBoard(next.focuses, next.roomItems);
    const mon = board.days.find((d) => d.day === 'Mon');

    expect(mon?.lanes.find((lane) => lane.daypart === 'Morning')?.items.map((item) => item.label)).toEqual(['Run']);
    expect(mon?.lanes.find((lane) => lane.daypart === 'Afternoon')?.items.map((item) => item.label)).toEqual(['Study']);
  });

  it('sorts two morning items', () => {
    const next = moveWeekPlacement(
      morningStudy,
      [],
      { sourceId: 'run', day: 'Mon', daypart: 'Morning' },
      { day: 'Mon', daypart: 'Morning', index: 0 },
    );
    const morning = layoutWeekBoard(next.focuses, next.roomItems)
      .days.find((d) => d.day === 'Mon')
      ?.lanes.find((lane) => lane.daypart === 'Morning')
      ?.items.map((item) => item.label);

    expect(morning).toEqual(['Run', 'Study']);
  });

  it('can date something that was not yet scheduled', () => {
    const next = moveWeekPlacement(
      focuses,
      roomItems,
      { sourceId: 'a2', day: null, daypart: null },
      { day: 'Wed', daypart: 'Evening', index: 0 },
    );
    const wed = layoutWeekBoard(next.focuses, next.roomItems).days.find((d) => d.day === 'Wed');
    expect(wed?.lanes.find((lane) => lane.daypart === 'Evening')?.items.map((item) => item.label)).toEqual([
      'Reach out to Sarah',
    ]);
    expect(next.focuses[0]?.actions.find((action) => action.id === 'a2')?.slots).toEqual([
      { day: 'Wed', dayparts: ['Evening'] },
    ]);
  });
});

describe('copyWeekPlacement', () => {
  const morningStudy: Focus[] = [
    {
      id: 'job',
      title: 'Job',
      actions: [
        { id: 'study', label: 'Study', checked: true, slots: [{ day: 'Mon', dayparts: ['Morning'] }] },
        { id: 'run', label: 'Run', checked: true, slots: [{ day: 'Mon', dayparts: ['Morning'] }] },
      ],
    },
  ];

  const labels = (plan: Focus[], day: 'Mon' | 'Tue', daypart: 'Morning' | 'Afternoon') =>
    layoutWeekBoard(plan, [])
      .days.find((column) => column.day === day)
      ?.lanes.find((lane) => lane.daypart === daypart)
      ?.items.map((item) => item.label);

  it('adds a second card and leaves the original where it was', () => {
    const next = copyWeekPlacement(
      morningStudy,
      [],
      { sourceId: 'study', day: 'Mon', daypart: 'Morning' },
      { day: 'Tue', daypart: 'Afternoon', index: 0 },
    );

    expect(labels(next.focuses, 'Mon', 'Morning')).toEqual(['Study', 'Run']);
    expect(labels(next.focuses, 'Tue', 'Afternoon')).toEqual(['Study']);
    expect(next.focuses[0]?.actions.find((action) => action.id === 'study')?.slots).toEqual([
      { day: 'Mon', dayparts: ['Morning'] },
      { day: 'Tue', dayparts: ['Afternoon'] },
    ]);
  });

  it('does not copy onto a lane that already has this item', () => {
    const next = copyWeekPlacement(
      morningStudy,
      [],
      { sourceId: 'study', day: 'Mon', daypart: 'Morning' },
      { day: 'Mon', daypart: 'Morning', index: 0 },
    );

    expect(next.focuses).toBe(morningStudy);
    expect(next.roomItems).toEqual([]);
  });

  it('does not copy from unscheduled', () => {
    const unscheduled: Focus[] = [
      {
        id: 'job',
        title: 'Job',
        actions: [{ id: 'study', label: 'Study', checked: true, slots: [] }],
      },
    ];

    expect(
      copyWeekPlacement(
        unscheduled,
        [],
        { sourceId: 'study', day: null, daypart: null },
        { day: 'Wed', daypart: 'Evening', index: 0 },
      ).focuses,
    ).toBe(unscheduled);
  });

  it('copies a scheduled action into unscheduled as its own item', () => {
    const next = copyWeekPlacement(
      morningStudy,
      [],
      { sourceId: 'study', day: 'Mon', daypart: 'Morning' },
      { day: null, daypart: null, index: 0 },
      'study-copy',
    );
    const board = layoutWeekBoard(next.focuses, next.roomItems);

    expect(labels(next.focuses, 'Mon', 'Morning')).toEqual(['Study', 'Run']);
    expect(board.unscheduled.map((item) => item.label)).toEqual(['Study']);
    expect(next.focuses[0]?.actions.find((action) => action.id === 'study')?.slots).toEqual([
      { day: 'Mon', dayparts: ['Morning'] },
    ]);
    expect(next.focuses[0]?.actions.find((action) => action.id === 'study-copy')).toMatchObject({
      label: 'Study',
      checked: true,
      slots: [],
    });
  });

  it('keeps the copy independent of the original', () => {
    const copied = copyWeekPlacement(
      morningStudy,
      [],
      { sourceId: 'study', day: 'Mon', daypart: 'Morning' },
      { day: null, daypart: null, index: 0 },
      'study-copy',
    );
    const scheduled = moveWeekPlacement(
      copied.focuses,
      copied.roomItems,
      { sourceId: 'study-copy', day: null, daypart: null },
      { day: 'Tue', daypart: 'Afternoon', index: 0 },
    );

    expect(labels(scheduled.focuses, 'Mon', 'Morning')).toEqual(['Study', 'Run']);
    expect(labels(scheduled.focuses, 'Tue', 'Afternoon')).toEqual(['Study']);
    expect(layoutWeekBoard(scheduled.focuses, scheduled.roomItems).unscheduled).toEqual([]);
  });

  it('copies a make-room item into unscheduled', () => {
    const rooms: RoomItem[] = [{ id: 'rest', label: 'Rest', slots: [{ day: 'Mon', dayparts: [] }] }];
    const next = copyWeekPlacement(
      [],
      rooms,
      { sourceId: 'rest', day: 'Mon', daypart: null },
      { day: null, daypart: null, index: 0 },
      'rest-copy',
    );

    expect(next.roomItems.map((item) => item.id)).toEqual(['rest', 'rest-copy']);
    expect(layoutWeekBoard(next.focuses, next.roomItems).unscheduled.map((item) => item.label)).toEqual(['Rest']);
  });

  it('needs an id for the copy it puts in unscheduled', () => {
    expect(
      copyWeekPlacement(
        morningStudy,
        [],
        { sourceId: 'study', day: 'Mon', daypart: 'Morning' },
        { day: null, daypart: null, index: 0 },
      ).focuses,
    ).toBe(morningStudy);
  });

  it('inserts the copy before a neighbor in the destination lane', () => {
    const next = copyWeekPlacement(
      morningStudy,
      [],
      { sourceId: 'run', day: 'Mon', daypart: 'Morning' },
      { day: 'Mon', daypart: 'Morning', index: 0 },
    );
    // Same lane is a no-op; copy onto afternoon in front of nothing, then
    // copy study in front of run on a second day that already has an item.
    const withRun = copyWeekPlacement(
      morningStudy,
      [],
      { sourceId: 'run', day: 'Mon', daypart: 'Morning' },
      { day: 'Tue', daypart: 'Morning', index: 0 },
    );
    const withBoth = copyWeekPlacement(
      withRun.focuses,
      [],
      { sourceId: 'study', day: 'Mon', daypart: 'Morning' },
      { day: 'Tue', daypart: 'Morning', index: 0 },
    );

    expect(next.focuses).toBe(morningStudy);
    expect(labels(withBoth.focuses, 'Tue', 'Morning')).toEqual(['Study', 'Run']);
    expect(labels(withBoth.focuses, 'Mon', 'Morning')).toEqual(['Study', 'Run']);
  });
});

describe('removeWeekPlacement', () => {
  const morningStudy: Focus[] = [
    {
      id: 'job',
      title: 'Job',
      actions: [
        { id: 'study', label: 'Study', checked: true, slots: [{ day: 'Mon', dayparts: ['Morning'] }] },
        { id: 'run', label: 'Run', checked: true, slots: [{ day: 'Mon', dayparts: ['Morning'] }] },
      ],
    },
  ];

  it('drops the last placement of an action from the week', () => {
    const next = removeWeekPlacement(morningStudy, [], { sourceId: 'study', day: 'Mon', daypart: 'Morning' });
    const study = next.focuses[0]?.actions.find((action) => action.id === 'study');
    const board = layoutWeekBoard(next.focuses, next.roomItems);

    expect(study?.checked).toBe(false);
    expect(study?.slots).toEqual([]);
    expect(board.days.flatMap((column) => column.lanes.flatMap((lane) => lane.items.map((item) => item.label)))).toEqual(
      ['Run'],
    );
  });

  it('removes one day and leaves the others', () => {
    const twoDays: Focus[] = [
      {
        id: 'job',
        title: 'Job',
        actions: [
          {
            id: 'study',
            label: 'Study',
            checked: true,
            slots: [
              { day: 'Mon', dayparts: ['Morning'] },
              { day: 'Tue', dayparts: ['Afternoon'] },
            ],
          },
        ],
      },
    ];
    const next = removeWeekPlacement(twoDays, [], { sourceId: 'study', day: 'Tue', daypart: 'Afternoon' });
    const study = next.focuses[0]?.actions.find((action) => action.id === 'study');

    expect(study?.checked).toBe(true);
    expect(study?.slots).toEqual([{ day: 'Mon', dayparts: ['Morning'] }]);
  });

  it('drops an unscheduled action from the week', () => {
    const unscheduled: Focus[] = [
      {
        id: 'job',
        title: 'Job',
        actions: [{ id: 'study', label: 'Study', checked: true, slots: [] }],
      },
    ];
    const next = removeWeekPlacement(unscheduled, [], { sourceId: 'study', day: null, daypart: null });

    expect(next.focuses[0]?.actions.find((action) => action.id === 'study')?.checked).toBe(false);
  });

  it('drops a make-room item from the week', () => {
    const room: RoomItem[] = [{ id: 'dinner', label: 'Dinner', slots: [{ day: 'Fri', dayparts: ['Evening'] }] }];
    const next = removeWeekPlacement([], room, { sourceId: 'dinner', day: 'Fri', daypart: 'Evening' });

    expect(next.roomItems).toEqual([]);
  });
});

describe('moveWeekPlacement lane independence', () => {
  // "Stretch" is on both Mon and Tue morning. Sorting one of those lanes used
  // to write a single shared order and quietly reshuffle the other.
  const twoDays: Focus[] = [
    {
      id: 'body',
      title: 'Body',
      actions: [
        {
          id: 'stretch',
          label: 'Stretch',
          checked: true,
          slots: [
            { day: 'Mon', dayparts: ['Morning'] },
            { day: 'Tue', dayparts: ['Morning'] },
          ],
        },
        { id: 'walk', label: 'Walk', checked: true, slots: [{ day: 'Mon', dayparts: ['Morning'] }] },
        { id: 'swim', label: 'Swim', checked: true, slots: [{ day: 'Tue', dayparts: ['Morning'] }] },
        { id: 'yoga', label: 'Yoga', checked: true, slots: [{ day: 'Tue', dayparts: ['Morning'] }] },
      ],
    },
  ];

  const morning = (plan: Focus[], day: 'Mon' | 'Tue') =>
    layoutWeekBoard(plan, [])
      .days.find((column) => column.day === day)
      ?.lanes.find((lane) => lane.daypart === 'Morning')
      ?.items.map((item) => item.label);

  it('leaves other lanes alone when one lane is sorted', () => {
    expect(morning(twoDays, 'Mon')).toEqual(['Stretch', 'Walk']);
    expect(morning(twoDays, 'Tue')).toEqual(['Stretch', 'Swim', 'Yoga']);

    // Send Stretch to the bottom of Tue morning only.
    const next = moveWeekPlacement(
      twoDays,
      [],
      { sourceId: 'stretch', day: 'Tue', daypart: 'Morning' },
      { day: 'Tue', daypart: 'Morning', index: 2 },
    );

    expect(morning(next.focuses, 'Tue')).toEqual(['Swim', 'Yoga', 'Stretch']);
    expect(morning(next.focuses, 'Mon')).toEqual(['Stretch', 'Walk']);
  });

  it('forgets the position an item held in the lane it left', () => {
    const sorted = moveWeekPlacement(
      twoDays,
      [],
      { sourceId: 'walk', day: 'Mon', daypart: 'Morning' },
      { day: 'Mon', daypart: 'Morning', index: 0 },
    );
    expect(morning(sorted.focuses, 'Mon')).toEqual(['Walk', 'Stretch']);

    const moved = moveWeekPlacement(
      sorted.focuses,
      [],
      { sourceId: 'walk', day: 'Mon', daypart: 'Morning' },
      { day: 'Mon', daypart: 'Evening', index: 0 },
    );
    const walk = moved.focuses[0]?.actions.find((action) => action.id === 'walk');
    expect(walk?.laneOrders?.['Mon:Morning']).toBeUndefined();
    expect(walk?.laneOrders?.['Mon:Evening']).toBe(0);
  });
});

describe('schedule toggles', () => {
  it('adds and removes a day', () => {
    const added = toggleSlotDay([], 'Tue');
    expect(added).toEqual([{ day: 'Tue', dayparts: [] }]);
    expect(toggleSlotDay(added, 'Tue')).toEqual([]);
  });

  it('toggles a daypart on a chosen day', () => {
    const withDay = toggleSlotDay([], 'Thu');
    const withTime = toggleSlotDaypart(withDay, 'Thu', 'Evening');
    expect(withTime).toEqual([{ day: 'Thu', dayparts: ['Evening'] }]);
    expect(toggleSlotDaypart(withTime, 'Thu', 'Evening')).toEqual([{ day: 'Thu', dayparts: [] }]);
  });
});

import { assignFocusColors, type Focus, type RoomItem } from '@tend/core';
import { focusPalette } from '@tend/ui-tokens';
import { describe, expect, it } from 'vitest';
import { glanceSummary, weekGlance } from './week-glance';

const emptySlots = [] as Focus['actions'][number]['slots'];

function action(
  id: string,
  label: string,
  checked: boolean,
  slots: Focus['actions'][number]['slots'] = emptySlots,
): Focus['actions'][number] {
  return { id, label, checked, slots };
}

describe('assignFocusColors', () => {
  it('assigns the lowest free index and keeps it when focuses are reordered', () => {
    const focuses: Focus[] = [
      { id: 'a', title: 'Work', actions: [] },
      { id: 'b', title: 'Health', actions: [] },
      { id: 'c', title: 'Family', actions: [] },
    ];
    const assigned = assignFocusColors(focuses);
    expect(assigned.map((focus) => focus.colorIndex)).toEqual([0, 1, 2]);
    expect(assignFocusColors(assigned)).toBe(assigned);

    const reordered = [assigned[2]!, assigned[0]!, assigned[1]!];
    const again = assignFocusColors(reordered);
    expect(again).toBe(reordered);
    expect(again.map((focus) => [focus.id, focus.colorIndex])).toEqual([
      ['c', 2],
      ['a', 0],
      ['b', 1],
    ]);
  });

  it('reuses a freed index without shifting the others', () => {
    const assigned = assignFocusColors([
      { id: 'a', title: 'Work', actions: [], colorIndex: 0 },
      { id: 'b', title: 'Health', actions: [], colorIndex: 1 },
      { id: 'c', title: 'Family', actions: [], colorIndex: 2 },
    ]);
    const withoutHealth = assigned.filter((focus) => focus.id !== 'b');
    const withNew = assignFocusColors([...withoutHealth, { id: 'd', title: 'Home', actions: [] }]);
    expect(withNew.map((focus) => [focus.id, focus.colorIndex])).toEqual([
      ['a', 0],
      ['c', 2],
      ['d', 1],
    ]);
  });

  it('repairs a duplicate index', () => {
    const next = assignFocusColors([
      { id: 'a', title: 'Work', actions: [], colorIndex: 0 },
      { id: 'b', title: 'Health', actions: [], colorIndex: 0 },
    ]);
    expect(next.map((focus) => focus.colorIndex)).toEqual([0, 1]);
  });
});

describe('weekGlance', () => {
  it('locks the focus palette to six indicator tokens', () => {
    expect(focusPalette).toEqual(['focus1', 'focus2', 'focus3', 'focus4', 'focus5', 'focus6']);
  });

  it('shows an empty week as seven days with no plans', () => {
    const glance = weekGlance([], []);
    expect(glance.planCount).toBe(0);
    expect(glance.days.map((day) => day.title)).toEqual([
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
      'Sunday',
    ]);
    expect(glance.days.every((day) => day.empty && day.groups.length === 0)).toBe(true);
    expect(glanceSummary(glance)).toBeNull();
  });

  it('summarizes planned days and actions for the collapsed card', () => {
    const one = weekGlance(
      [{ id: 'job', title: 'Work', actions: [action('study', 'Study', true, [{ day: 'Wed', dayparts: ['Morning'] }])] }],
      [],
    );
    expect(glanceSummary(one)).toBe('1 day planned · 1 action');

    const several = weekGlance(
      [
        {
          id: 'job',
          title: 'Work',
          actions: [
            action('study', 'Study', true, [{ day: 'Wed', dayparts: ['Morning'] }]),
            action('call', 'Call', true, [{ day: 'Thu', dayparts: ['Afternoon'] }]),
          ],
        },
      ],
      [{ id: 'walk', label: 'Beach walk', slots: [{ day: 'Wed', dayparts: ['Evening'] }] }],
    );
    expect(glanceSummary(several)).toBe('2 days planned · 3 actions');
  });

  it('lists checked actions from one focus and omits unchecked or unscheduled ones', () => {
    const focuses: Focus[] = [
      {
        id: 'job',
        title: 'Work',
        colorIndex: 0,
        actions: [
          action('study', 'Study', true, [{ day: 'Wed', dayparts: ['Morning'] }]),
          action('call', 'Call', true),
          action('later', 'Later', false, [{ day: 'Tue', dayparts: ['Evening'] }]),
        ],
      },
    ];
    const glance = weekGlance(focuses, []);
    expect(glance.plans.map((plan) => plan.label)).toEqual(['Study']);
    expect(glance.days.find((day) => day.day === 'Wed')?.groups).toEqual([
      {
        daypart: 'Morning',
        label: 'Morning',
        plans: [
          expect.objectContaining({
            label: 'Study',
            focusTitle: 'Work',
            colorIndex: 0,
          }),
        ],
      },
    ]);
    expect(glance.days.find((day) => day.day === 'Tue')?.empty).toBe(true);
  });

  it('gives six focuses distinct colors and keeps them when the list is reordered', () => {
    const focuses: Focus[] = ['Work', 'Health', 'Family', 'Home', 'Friends', 'Rest'].map((title) => ({
      id: title,
      title,
      actions: [action(title, title, true, [{ day: 'Mon', dayparts: ['Morning'] }])],
    }));
    const glance = weekGlance(focuses, []);
    expect(glance.plans.map((plan) => plan.colorIndex)).toEqual([0, 1, 2, 3, 4, 5]);

    const reordered = [focuses[5]!, focuses[0]!, ...focuses.slice(1, 5)];
    const colored = assignFocusColors(weekGlance(focuses, []).plans.length ? assignFocusColors(focuses) : focuses);
    const saved = assignFocusColors(focuses);
    const again = weekGlance([saved[3]!, saved[0]!, saved[5]!], []);
    expect(again.plans.map((plan) => [plan.label, plan.colorIndex])).toEqual([
      ['Home', 3],
      ['Work', 0],
      ['Rest', 5],
    ]);
    expect(reordered[0]?.title).toBe('Rest');
    expect(colored[0]?.id).toBe('Work');
  });

  it('allows several plans in one daypart', () => {
    const focuses: Focus[] = [
      {
        id: 'job',
        title: 'Work',
        colorIndex: 0,
        actions: [action('yoga', 'Go to yoga', true, [{ day: 'Wed', dayparts: ['Evening'] }])],
      },
    ];
    const room: RoomItem[] = [{ id: 'dinner', label: 'Dinner with family', slots: [{ day: 'Wed', dayparts: ['Evening'] }] }];
    const wednesday = weekGlance(focuses, room).days.find((day) => day.day === 'Wed');
    expect(wednesday?.groups.map((group) => group.label)).toEqual(['Evening']);
    expect(wednesday?.groups[0]?.plans.map((plan) => plan.label)).toEqual(['Go to yoga', 'Dinner with family']);
    expect(wednesday?.groups[0]?.plans.map((plan) => plan.colorIndex)).toEqual([0, null]);
    expect(wednesday?.groups[0]?.plans[1]?.focusTitle).toBeNull();
  });

  it('repeats an action on each day and daypart it is assigned to', () => {
    const focuses: Focus[] = [
      {
        id: 'health',
        title: 'Health',
        colorIndex: 1,
        actions: [
          action('train', 'Strength training', true, [
            { day: 'Tue', dayparts: ['Evening'] },
            { day: 'Thu', dayparts: ['Morning', 'Evening'] },
          ]),
        ],
      },
    ];
    const glance = weekGlance(focuses, []);
    expect(glance.plans.map((plan) => [plan.day, plan.daypart])).toEqual([
      ['Tue', 'Evening'],
      ['Thu', 'Morning'],
      ['Thu', 'Evening'],
    ]);
    expect(glance.planCount).toBe(3);
  });

  it('puts a day with no daypart under Anytime', () => {
    const focuses: Focus[] = [
      {
        id: 'job',
        title: 'Work',
        colorIndex: 0,
        actions: [action('read', 'Read', true, [{ day: 'Mon', dayparts: [] }])],
      },
    ];
    const monday = weekGlance(focuses, []).days[0];
    expect(monday?.groups.map((group) => group.label)).toEqual(['Anytime']);
    expect(monday?.empty).toBe(false);
  });

  it('reflects a rename, an uncheck, and a delete on the next call', () => {
    const base: Focus = {
      id: 'job',
      title: 'Work',
      colorIndex: 0,
      actions: [
        action('study', 'Study', true, [{ day: 'Wed', dayparts: ['Morning'] }]),
        action('call', 'Call', true, [{ day: 'Thu', dayparts: ['Afternoon'] }]),
      ],
    };
    expect(weekGlance([{ ...base, actions: base.actions.map((item) => (item.id === 'study' ? { ...item, label: 'Read' } : item)) }], []).plans.map((plan) => plan.label)).toEqual([
      'Read',
      'Call',
    ]);
    expect(
      weekGlance([{ ...base, actions: base.actions.map((item) => (item.id === 'study' ? { ...item, checked: false } : item)) }], []).plans.map(
        (plan) => plan.label,
      ),
    ).toEqual(['Call']);
    expect(weekGlance([{ ...base, actions: base.actions.filter((item) => item.id !== 'study') }], []).plans.map((plan) => plan.label)).toEqual([
      'Call',
    ]);
  });

  it('includes a scheduled make-room item and skips one without a day', () => {
    const room: RoomItem[] = [
      { id: 'walk', label: 'Beach walk', slots: [{ day: 'Fri', dayparts: ['Afternoon'] }] },
      { id: 'read', label: 'Read', slots: [] },
    ];
    const glance = weekGlance([], room);
    expect(glance.plans.map((plan) => plan.label)).toEqual(['Beach walk']);
    expect(glance.plans[0]).toMatchObject({ focusTitle: null, colorIndex: null, day: 'Fri', daypart: 'Afternoon' });
  });
});

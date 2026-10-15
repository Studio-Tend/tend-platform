import type { Focus, RoomItem } from '@tend/core';

/**
 * Example starting data, matching the design walkthrough (job search / strength /
 * family). Replace with `[]` for focuses and roomItems once this is wired to a
 * real backend — the flow works the same with an empty start.
 */
export function seedFocuses(): Focus[] {
  return [
    {
      id: 'job',
      title: 'Career development',
      actions: [
        {
          id: 'a1',
          label: 'Finish portfolio case study',
          checked: true,
          slots: [{ day: 'Tue', dayparts: ['Afternoon'] }],
        },
        { id: 'a2', label: 'Reach out to Sarah', checked: true, slots: [] },
        { id: 'a3', label: 'Apply to two strong-fit roles', checked: false, slots: [] },
        { id: 'a4', label: 'Update LinkedIn headline', checked: false, slots: [] },
        { id: 'a5', label: 'Practice a system design interview', checked: false, slots: [] },
        { id: 'a6', label: 'Clean up GitHub profile', checked: false, slots: [] },
      ],
    },
    {
      id: 'strength',
      title: 'Get stronger',
      actions: [
        {
          id: 'a7',
          label: 'Strength training',
          checked: true,
          slots: [
            { day: 'Tue', dayparts: ['Evening'] },
            { day: 'Thu', dayparts: ['Morning', 'Evening'] },
          ],
        },
        { id: 'a8', label: 'Go to yoga', checked: false, slots: [] },
        { id: 'a9', label: 'Try a new class', checked: false, slots: [] },
        { id: 'a10', label: 'Meal prep Sundays', checked: false, slots: [] },
      ],
    },
    {
      id: 'family',
      title: 'Spend time with family',
      actions: [
        { id: 'a11', label: 'Sunday lunch', checked: true, slots: [{ day: 'Sun', dayparts: ['Afternoon'] }] },
        { id: 'a12', label: 'Call mom', checked: false, slots: [] },
        { id: 'a13', label: 'Family game night', checked: false, slots: [] },
      ],
    },
  ];
}

export function seedRoomItems(): RoomItem[] {
  return [
    { id: 'r1', label: 'Beach walk', slots: [] },
    { id: 'r2', label: 'Dinner with friends', slots: [{ day: 'Fri', dayparts: ['Evening'] }] },
    { id: 'r3', label: 'Nothing planned', slots: [{ day: 'Sun', dayparts: ['Morning'] }] },
  ];
}

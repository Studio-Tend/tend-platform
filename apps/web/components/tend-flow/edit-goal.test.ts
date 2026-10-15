import { describe, expect, it } from 'vitest';
import type { Focus } from '@tend/core';
import { applyGoalDraft, isGoalDraftDirty, replaceFocus } from './edit-goal';

const goal: Focus = {
  id: 'strength',
  title: 'Get stronger',
  actions: [
    {
      id: 'lift',
      label: 'Strength training',
      checked: true,
      slots: [{ day: 'Mon', dayparts: ['Evening'] }],
      laneOrders: { 'Mon:Evening': 0 },
    },
    { id: 'rest', label: 'Rest', checked: false, slots: [] },
  ],
};

describe('applyGoalDraft', () => {
  it('renames and reorders without new ids or lost schedules', () => {
    const next = applyGoalDraft(goal, {
      title: 'Strength',
      actions: [
        { id: 'rest', label: 'Rest day' },
        { id: 'lift', label: 'Strength training' },
      ],
    });

    expect(next.id).toBe('strength');
    expect(next.title).toBe('Strength');
    expect(next.actions.map((action) => action.id)).toEqual(['rest', 'lift']);
    expect(next.actions[0]).toMatchObject({ id: 'rest', label: 'Rest day', checked: false, slots: [] });
    expect(next.actions[1]).toBe(goal.actions[0]);
  });

  it('adds an action to the week with no day, so it stays unscheduled', () => {
    const next = applyGoalDraft(goal, {
      title: goal.title,
      actions: [...goal.actions.map((action) => ({ id: action.id, label: action.label })), { id: 'walk', label: 'Walk' }],
    });

    expect(next.actions[2]).toEqual({ id: 'walk', label: 'Walk', checked: true, slots: [] });
    expect(next.actions[0]).toBe(goal.actions[0]);
  });

  it('drops a deleted action and leaves the others scheduled', () => {
    const next = applyGoalDraft(goal, {
      title: goal.title,
      actions: [{ id: 'rest', label: 'Rest' }],
    });

    expect(next.actions).toEqual([goal.actions[1]]);
  });

  it('treats a trimmed match as unchanged', () => {
    expect(
      isGoalDraftDirty(goal, {
        title: 'Get stronger',
        actions: goal.actions.map((action) => ({ id: action.id, label: action.label })),
      }),
    ).toBe(false);
    expect(isGoalDraftDirty(goal, { title: 'Get stronger', actions: [] }, 'Walk')).toBe(true);
  });
});

describe('replaceFocus', () => {
  it('replaces one goal and leaves the rest', () => {
    const other: Focus = { id: 'job', title: 'Job', actions: [] };
    const next = { ...goal, title: 'Strength' };
    expect(replaceFocus([other, goal], next)).toEqual([other, next]);
  });
});

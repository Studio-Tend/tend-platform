import { laneItems, layoutWeekBoard } from '@tend/core';
import { describe, expect, it } from 'vitest';
import { mockWeekPlan, shouldLoadDevMock } from './mock-week';

describe('mockWeekPlan', () => {
  it('places items across the week, shares a lane, and leaves some unscheduled', () => {
    const { focuses, roomItems } = mockWeekPlan();
    const board = layoutWeekBoard(focuses, roomItems);

    expect(laneItems(board, 'Tue', 'Afternoon').map((item) => item.label)).toEqual([
      'Finish portfolio case study',
      'Sketch the case study outline',
    ]);
    expect(laneItems(board, 'Fri', 'Evening').map((item) => item.label)).toEqual([
      'Family game night',
      'Dinner with friends',
    ]);
    expect(laneItems(board, 'Mon', 'Evening').map((item) => item.label)).toEqual(['Strength training']);
    expect(laneItems(board, 'Sat', 'Morning').map((item) => item.label)).toEqual(['Strength training']);
    expect(board.unscheduled.map((item) => item.label)).toEqual([
      'Practice a system design interview',
      'Nothing planned',
    ]);
  });
});

describe('shouldLoadDevMock', () => {
  it('loads only in development, and ?empty opts out', () => {
    expect(shouldLoadDevMock('development', '')).toBe(true);
    expect(shouldLoadDevMock('development', '?empty')).toBe(false);
    expect(shouldLoadDevMock('development', '?empty=1')).toBe(false);
    expect(shouldLoadDevMock('test', '')).toBe(false);
    expect(shouldLoadDevMock('production', '')).toBe(false);
  });
});

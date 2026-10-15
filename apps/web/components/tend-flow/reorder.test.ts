import { describe, expect, it } from 'vitest';
import { moveById, reorderById } from './reorder';

const items = [
  { id: 'a', label: 'A' },
  { id: 'b', label: 'B' },
  { id: 'c', label: 'C' },
];

describe('reorderById', () => {
  it('moves an item up into the target slot', () => {
    expect(reorderById(items, 'c', 'a').map((item) => item.id)).toEqual(['c', 'a', 'b']);
  });

  it('moves an item down into the target slot', () => {
    expect(reorderById(items, 'a', 'c').map((item) => item.id)).toEqual(['b', 'c', 'a']);
  });

  it('returns the same list when the item is dropped on itself or is missing', () => {
    expect(reorderById(items, 'b', 'b')).toBe(items);
    expect(reorderById(items, 'missing', 'a')).toBe(items);
  });
});

describe('moveById', () => {
  it('swaps with the neighbor and stops at the ends', () => {
    expect(moveById(items, 'b', -1).map((item) => item.id)).toEqual(['b', 'a', 'c']);
    expect(moveById(items, 'b', 1).map((item) => item.id)).toEqual(['a', 'c', 'b']);
    expect(moveById(items, 'a', -1)).toBe(items);
    expect(moveById(items, 'c', 1)).toBe(items);
  });
});

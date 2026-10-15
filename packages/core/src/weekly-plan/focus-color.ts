import type { Focus } from './types';

/** Matches `focusPalette` in `@tend/ui-tokens`. */
export const FOCUS_PALETTE_SIZE = 6;

function claimableIndex(value: number | undefined, used: ReadonlySet<number>): number | null {
  if (value === undefined || !Number.isInteger(value) || value < 0 || value >= FOCUS_PALETTE_SIZE || used.has(value)) {
    return null;
  }
  return value;
}

/**
 * Gives every focus a palette index. Existing indexes stay put, including
 * across a reorder. A missing or duplicate index takes the lowest free one.
 * Returns the same array when nothing needed assigning.
 */
export function assignFocusColors(focuses: Focus[]): Focus[] {
  const used = new Set<number>();
  const kept = focuses.map((focus) => {
    const index = claimableIndex(focus.colorIndex, used);
    if (index === null) return null;
    used.add(index);
    return index;
  });

  if (kept.every((index) => index !== null)) return focuses;

  return focuses.map((focus, i) => {
    const index = kept[i];
    if (index !== null) return focus;
    let next = 0;
    while (used.has(next)) next += 1;
    const colorIndex = next < FOCUS_PALETTE_SIZE ? next : next % FOCUS_PALETTE_SIZE;
    used.add(colorIndex);
    return { ...focus, colorIndex };
  });
}

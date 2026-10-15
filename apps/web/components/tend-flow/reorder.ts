/** Moves `fromId` into the slot occupied by `toId`. Same list reference when nothing moves. */
export function reorderById<T extends { id: string }>(items: readonly T[], fromId: string, toId: string): T[] {
  if (fromId === toId) return items as T[];
  const from = items.findIndex((item) => item.id === fromId);
  const to = items.findIndex((item) => item.id === toId);
  if (from < 0 || to < 0) return items as T[];
  const next = items.slice();
  const [moved] = next.splice(from, 1);
  if (!moved) return items as T[];
  next.splice(to, 0, moved);
  return next;
}

/** Swaps an item with its neighbor. `delta` -1 moves it up, 1 moves it down. */
export function moveById<T extends { id: string }>(items: readonly T[], id: string, delta: -1 | 1): T[] {
  const index = items.findIndex((item) => item.id === id);
  const neighbor = items[index + delta];
  if (index < 0 || !neighbor) return items as T[];
  return reorderById(items, id, neighbor.id);
}

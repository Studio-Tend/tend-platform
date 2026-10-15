import { useCallback, useSyncExternalStore } from 'react';

/**
 * Tracks a CSS media query. There is no viewport on the server, so the first
 * render always reports no match and corrects itself once mounted.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const list = window.matchMedia?.(query);
      if (!list) return () => undefined;
      list.addEventListener('change', onChange);
      return () => list.removeEventListener('change', onChange);
    },
    [query],
  );

  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia?.(query)?.matches ?? false,
    () => false,
  );
}

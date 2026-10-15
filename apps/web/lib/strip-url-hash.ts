/**
 * Drops the `#…` fragment from a URL. The planner's reopen link keeps the
 * whole plan in `#w=`, so no URL leaves the browser for analytics with it.
 */
export function stripUrlHash(url: string): string {
  const index = url.indexOf('#');
  return index === -1 ? url : url.slice(0, index);
}

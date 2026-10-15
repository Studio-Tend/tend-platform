export type AnalyticsProperties = Record<string, string | number | boolean | null | undefined>;

export function compactProperties(
  properties?: AnalyticsProperties,
): Record<string, string | number | boolean> | undefined {
  if (!properties) return undefined;
  const next: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(properties)) {
    if (value === undefined || value === null || value === '') continue;
    next[key] = value;
  }
  return next;
}

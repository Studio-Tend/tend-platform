/**
 * Namespace Redis keys so staging and production can share one Upstash database.
 * Production leaves REDIS_KEY_PREFIX unset, so existing keys stay as they are.
 * Staging sets it to `staging`, which yields `staging:<key>`.
 */
export function redisKey(key: string): string {
  const raw = process.env.REDIS_KEY_PREFIX?.trim() ?? '';
  const prefix = raw === '' ? '' : raw.endsWith(':') ? raw : `${raw}:`;
  return `${prefix}${key}`;
}

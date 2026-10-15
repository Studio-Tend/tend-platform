/**
 * Whether this deploy should report analytics.
 *
 * `NODE_ENV` alone is not enough: Vercel builds staging and preview deploys
 * with `NODE_ENV=production` too, so their events would land in the live
 * PostHog project next to real use. Only the Vercel production environment
 * reports. Outside Vercel (no `VERCEL_ENV`), a production build still reports.
 *
 * Callers pass the Vercel value for their side: the browser reads
 * `NEXT_PUBLIC_VERCEL_ENV` (inlined at build), the server reads `VERCEL_ENV`.
 */
export function isAnalyticsEnvironment(
  nodeEnv: string | undefined,
  vercelEnv: string | undefined,
): boolean {
  if (nodeEnv !== 'production') return false;
  if (!vercelEnv) return true;
  return vercelEnv === 'production';
}

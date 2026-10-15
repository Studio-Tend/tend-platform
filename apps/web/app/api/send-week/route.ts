import { track } from '@/lib/analytics.server';
import { layoutWeek, SendWeekRequestSchema } from '@tend/core';
import { PLAN_EVENTS } from '@/lib/plan-events';
import { buildWeekCalendar } from '@/lib/calendar/week-calendar';
import { upcomingMonday } from '@/lib/calendar/upcoming-monday';
import { EmailConfigError, buildWeekEmailMessage, sendEmail } from '@/lib/email/send';
import { encodePlanLink } from '@/lib/plan-link';
import {
  RateLimitConfigError,
  clientIp,
  limitByIp,
  limitByRecipient,
  type RateLimitVerdict,
} from '@/lib/rate-limit';

// The Resend SDK and React rendering want Node APIs, not the Edge runtime.
export const runtime = 'nodejs';

const EMAIL_PROVIDER = 'resend';
const MAX_BODY_BYTES = 256 * 1024;
const SITE_URL = process.env.SITE_URL ?? 'https://www.heytend.co';
const REOPEN_SOURCE = 'week_email';

/** RFC 9457 problem details, same shape as the API starter uses. */
function problem(status: number, title: string, detail?: string, headers?: Record<string, string>) {
  return Response.json(
    { type: 'about:blank', title, status, ...(detail ? { detail } : {}) },
    { status, headers: { 'Content-Type': 'application/problem+json', ...headers } },
  );
}

/** Runs one limit check. Returns a response to send back, or null to carry on. */
async function overLimit(check: () => Promise<RateLimitVerdict>): Promise<Response | null> {
  try {
    const verdict = await check();
    if (verdict.ok) return null;
    return problem(429, 'Too many requests', 'You have sent your week a few times already. Try again later.', {
      'Retry-After': String(verdict.retryAfter),
    });
  } catch (err) {
    if (err instanceof RateLimitConfigError) {
      console.error('send-week: refusing to send unlimited', err.message);
      return problem(503, 'Service unavailable', 'Please try again in a minute.');
    }
    throw err;
  }
}

export async function POST(request: Request) {
  const length = Number(request.headers.get('content-length') ?? 0);
  if (length > MAX_BODY_BYTES) {
    return problem(413, 'Request too large');
  }

  // Checked before parsing, so a flood of malformed bodies counts too.
  const ipLimited = await overLimit(() => limitByIp(clientIp(request)));
  if (ipLimited) return ipLimited;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return problem(400, 'Invalid JSON');
  }

  const parsed = SendWeekRequestSchema.safeParse(body);
  if (!parsed.success) {
    const timeZoneIssue = parsed.error.issues.some((i) => i.path[0] === 'timeZone');
    if (timeZoneIssue) {
      return problem(400, 'Invalid request', 'The time zone could not be read.');
    }
    const emailIssue = parsed.error.issues.some((i) => i.path[0] === 'email');
    return problem(
      422,
      'Invalid request',
      emailIssue ? 'Check the email address and try again.' : 'The plan could not be read.',
    );
  }

  const { email, plan, timeZone, company, session_id } = parsed.data;

  // Honeypot filled: pretend it worked so bots learn nothing.
  if (company) {
    return new Response(null, { status: 202 });
  }

  // Caps how often one address can be mailed, whatever IP is asking.
  const recipientLimited = await overLimit(() => limitByRecipient(email));
  if (recipientLimited) return recipientLimited;

  const week = layoutWeek(plan.focuses, plan.roomItems);
  const weekStart = upcomingMonday(new Date(), timeZone);
  // `source` lets analytics tell an email reopen from direct traffic: email
  // clients strip the referrer. It sits before the fragment so it stays in
  // the URL after PlanFlow clears `#w=`.
  const planUrl = `${SITE_URL.replace(/\/$/, '')}/plan/week?source=${REOPEN_SOURCE}#w=${await encodePlanLink(plan)}`;
  const ics = buildWeekCalendar({ week, weekStart, timeZone });

  try {
    const { id } = await sendEmail(
      await buildWeekEmailMessage({ to: email, week, weekStart, planUrl, ics }),
    );
    console.info('send-week: sent', { id, days: week.days.reduce((n, d) => n + d.entries.length, 0) });
  } catch (err) {
    // Never log the address itself.
    console.error('send-week: failed', err instanceof Error ? err.message : err);
    if (err instanceof EmailConfigError) {
      return problem(503, 'Email is not configured');
    }
    return problem(502, 'Email could not be sent', 'Please try again in a minute.');
  }

  try {
    await track(
      PLAN_EVENTS.weekEmailSent,
      { session_id: session_id ?? '', provider: EMAIL_PROVIDER, send_status: 'sent' },
      { headers: request.headers }
    );
  } catch {
    // Analytics must not fail a successful send.
  }

  return new Response(null, { status: 202 });
}

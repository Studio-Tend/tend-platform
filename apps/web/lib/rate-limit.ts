import { createHash } from 'node:crypto';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { redisKey } from './redis-key';

/*
 * Limits for POST /api/send-week.
 *
 * That route will email the week to whatever address it is given, from our
 * verified domain. Abuse therefore costs us our Resend sender reputation, not
 * the person scripting it, and the honeypot field only catches lazy bots. Two
 * windows, because they fail in different directions:
 *
 *  - per IP, so one client can't drive the endpoint in a loop
 *  - per recipient per day, so rotating IPs can't be used to mailbomb one
 *    address
 *
 * `timeout` lets a slow Upstash call through rather than holding up a send;
 * a blip in our infrastructure shouldn't cost someone their week.
 *
 * Prefixes go through `redisKey`, so a staging deploy with REDIS_KEY_PREFIX
 * set keeps its counters off the production keyspace in a shared database.
 */

const UPSTASH_TIMEOUT_MS = 1_000;

export class RateLimitConfigError extends Error {}

const configured = Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
const redis = configured ? Redis.fromEnv() : null;

const perIp = redis
  ? new Ratelimit({
      redis,
      prefix: redisKey('send-week:ip'),
      limiter: Ratelimit.slidingWindow(5, '1 h'),
      timeout: UPSTASH_TIMEOUT_MS,
    })
  : null;

const perRecipient = redis
  ? new Ratelimit({
      redis,
      prefix: redisKey('send-week:to'),
      limiter: Ratelimit.fixedWindow(3, '24 h'),
      timeout: UPSTASH_TIMEOUT_MS,
    })
  : null;

export interface RateLimitVerdict {
  ok: boolean;
  /** Seconds until the window reopens, for the `Retry-After` header. */
  retryAfter: number;
}

const ALLOWED: RateLimitVerdict = { ok: true, retryAfter: 0 };

/**
 * Missing credentials in production means someone shipped without wiring
 * Upstash up. Say so loudly instead of quietly serving an open endpoint.
 * Locally and in tests, no credentials just means no limiting.
 */
function assertConfigured(): void {
  if (!configured && process.env.NODE_ENV === 'production') {
    throw new RateLimitConfigError('UPSTASH_REDIS_REST_URL / _TOKEN are not set');
  }
}

async function check(limiter: Ratelimit | null, key: string): Promise<RateLimitVerdict> {
  assertConfigured();
  if (!limiter) return ALLOWED;
  try {
    const { success, reset } = await limiter.limit(key);
    if (success) return ALLOWED;
    return { ok: false, retryAfter: Math.max(1, Math.ceil((reset - Date.now()) / 1000)) };
  } catch (err) {
    // Reachable but erroring. Log it and let the send through.
    console.error('rate-limit: check failed', err instanceof Error ? err.message : err);
    return ALLOWED;
  }
}

/** Leftmost `x-forwarded-for` entry, which is the client as Vercel sets it. */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return forwarded || request.headers.get('x-real-ip') || 'unknown';
}

export function limitByIp(ip: string): Promise<RateLimitVerdict> {
  return check(perIp, ip);
}

export function limitByRecipient(email: string): Promise<RateLimitVerdict> {
  // Hashed so the keyspace never holds a plaintext address, matching the
  // route's rule about never logging one.
  const key = createHash('sha256').update(email).digest('hex').slice(0, 32);
  return check(perRecipient, key);
}

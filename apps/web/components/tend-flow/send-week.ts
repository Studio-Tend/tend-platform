import type { SendWeekRequest } from '@tend/core';

export type SendWeekPayload = SendWeekRequest;

export const TEND_WAITLIST_URL = 'https://www.heytend.co/#waitlist';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateWeekEmail(value: string): string | null {
  const email = value.trim();
  if (!email) return 'Enter an email address.';
  if (!EMAIL_PATTERN.test(email)) return 'Enter a valid email address.';
  return null;
}

/** Thrown when the week was refused because of a rate limit, not a fault. */
export class SendWeekLimitError extends Error {}

export async function sendWeek(payload: SendWeekPayload): Promise<void> {
  const response = await fetch('/api/send-week', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (response.status === 429) {
    throw new SendWeekLimitError('Rate limited');
  }
  if (!response.ok) {
    throw new Error('Failed to send week');
  }
}

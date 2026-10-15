// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { track } from '@/lib/analytics.server';
import type { EmailMessage } from '@/lib/email/send';

vi.mock('@/lib/email/send', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/email/send')>();
  return {
    ...actual,
    sendEmail: vi.fn().mockResolvedValue({ id: 'email-1' }),
  };
});

vi.mock('@/lib/rate-limit', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/rate-limit')>();
  return {
    ...actual,
    limitByIp: vi.fn(),
    limitByRecipient: vi.fn(),
  };
});

import { upcomingMonday } from '@/lib/calendar/upcoming-monday';
import { sendEmail } from '@/lib/email/send';
import { icsFilename } from '@/lib/email/week-layout';
import { RateLimitConfigError, limitByIp, limitByRecipient } from '@/lib/rate-limit';
import { POST } from './route';

const allowed = { ok: true, retryAfter: 0 };

beforeEach(() => {
  vi.mocked(limitByIp).mockResolvedValue(allowed);
  vi.mocked(limitByRecipient).mockResolvedValue(allowed);
});

afterEach(() => {
  vi.mocked(track).mockClear();
  vi.mocked(sendEmail).mockClear();
  vi.mocked(limitByIp).mockReset();
  vi.mocked(limitByRecipient).mockReset();
});

const validBody = {
  email: 'you@email.com',
  session_id: 'session-1',
  timeZone: 'America/New_York',
  plan: {
    focuses: [
      {
        id: 'job',
        title: 'Job',
        actions: [
          {
            id: 'a1',
            label: 'Finish case study',
            checked: true,
            slots: [{ day: 'Tue', dayparts: ['Afternoon'] }],
          },
        ],
      },
    ],
    roomItems: [],
  },
};

function post(body: unknown, headers: Record<string, string> = {}) {
  return POST(
    new Request('http://localhost/api/send-week', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
    }),
  );
}

function lastMessage(): EmailMessage {
  return vi.mocked(sendEmail).mock.calls[0][0] as EmailMessage;
}

describe('POST /api/send-week', () => {
  it('tracks week_email_sent after the provider accepts the message', async () => {
    const response = await post(validBody);

    expect(response.status).toBe(202);
    expect(sendEmail).toHaveBeenCalledOnce();
    expect(track).toHaveBeenCalledWith(
      'week_email_sent',
      { session_id: 'session-1', provider: 'resend', send_status: 'sent' },
      expect.objectContaining({ headers: expect.anything() }),
    );
  });

  it('attaches a calendar file and a reopen link the client cannot set', async () => {
    await post({
      ...validBody,
      url: 'https://evil.example/plan/week#w=hacked',
      planUrl: 'https://evil.example/plan/week#w=hacked',
    });

    const message = lastMessage();
    const attachment = message.attachments?.[0];
    const filename = icsFilename(upcomingMonday(new Date(), validBody.timeZone));
    expect(attachment?.filename).toBe(filename);
    expect(attachment?.contentType).toBe('text/calendar; charset=utf-8; method=PUBLISH');
    expect(typeof attachment?.content).toBe('string');
    expect(String(attachment?.content)).toContain('METHOD:PUBLISH');
    // Tagged so a reopen from the email is not counted as direct traffic.
    expect(message.html).toContain('https://www.heytend.co/plan/week?source=week_email#w=');
    expect(message.text).toContain('https://www.heytend.co/plan/week?source=week_email#w=');
    expect(message.html).toContain(filename);
    expect(message.text).toContain(`Open the attached ${filename}.`);
    expect(message.html).toContain('Join the waitlist');
    expect(message.text).toContain('https://www.heytend.co/#waitlist');
    expect(message.html).not.toContain('evil.example');
    expect(message.text).not.toContain('evil.example');
  });

  it('rejects an invalid email without tracking sent', async () => {
    const response = await post({ ...validBody, email: 'not-an-email' });

    expect(response.status).toBe(422);
    expect(sendEmail).not.toHaveBeenCalled();
    expect(track).not.toHaveBeenCalled();
  });

  it('rejects a bad time zone with 400', async () => {
    const response = await post({ ...validBody, timeZone: 'Not/A/Zone' });

    expect(response.status).toBe(400);
    expect(sendEmail).not.toHaveBeenCalled();
    expect(track).not.toHaveBeenCalled();
  });

  it('does not track honeypot submissions', async () => {
    const response = await post({ ...validBody, company: 'https://spam.example' });

    expect(response.status).toBe(202);
    expect(sendEmail).not.toHaveBeenCalled();
    expect(track).not.toHaveBeenCalled();
  });
});

describe('POST /api/send-week rate limits', () => {
  it('refuses an IP over its limit before reading the body', async () => {
    vi.mocked(limitByIp).mockResolvedValue({ ok: false, retryAfter: 90 });

    const response = await post(validBody, { 'x-forwarded-for': '203.0.113.7, 70.41.3.18' });

    expect(response.status).toBe(429);
    expect(response.headers.get('Retry-After')).toBe('90');
    expect(limitByIp).toHaveBeenCalledWith('203.0.113.7');
    expect(limitByRecipient).not.toHaveBeenCalled();
    expect(sendEmail).not.toHaveBeenCalled();
    expect(track).not.toHaveBeenCalled();
  });

  it('refuses a recipient that has had its fill today', async () => {
    vi.mocked(limitByRecipient).mockResolvedValue({ ok: false, retryAfter: 3600 });

    const response = await post(validBody);

    expect(response.status).toBe(429);
    expect(response.headers.get('Retry-After')).toBe('3600');
    expect(limitByRecipient).toHaveBeenCalledWith('you@email.com');
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('does not spend a recipient send on a honeypot submission', async () => {
    const response = await post({ ...validBody, company: 'https://spam.example' });

    expect(response.status).toBe(202);
    expect(limitByRecipient).not.toHaveBeenCalled();
  });

  it('refuses to send at all when limiting is not configured', async () => {
    vi.mocked(limitByIp).mockRejectedValue(new RateLimitConfigError('not set'));
    const logged = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const response = await post(validBody);

    expect(response.status).toBe(503);
    expect(sendEmail).not.toHaveBeenCalled();
    logged.mockRestore();
  });

  it('lets an ordinary send through both checks', async () => {
    const response = await post(validBody);

    expect(response.status).toBe(202);
    expect(limitByIp).toHaveBeenCalledOnce();
    expect(limitByRecipient).toHaveBeenCalledOnce();
    expect(sendEmail).toHaveBeenCalledOnce();
  });
});

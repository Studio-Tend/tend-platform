import { afterEach, describe, expect, it, vi } from 'vitest';
import { sendWeek, validateWeekEmail } from './send-week';

describe('validateWeekEmail', () => {
  it('requires a value', () => {
    expect(validateWeekEmail('')).toBe('Enter an email address.');
    expect(validateWeekEmail('   ')).toBe('Enter an email address.');
  });

  it('rejects malformed addresses', () => {
    expect(validateWeekEmail('not-an-email')).toBe('Enter a valid email address.');
    expect(validateWeekEmail('missing@domain')).toBe('Enter a valid email address.');
  });

  it('accepts a simple address and trims it', () => {
    expect(validateWeekEmail('  you@email.com  ')).toBeNull();
  });
});

describe('sendWeek', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('posts the week to the send-week API', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);

    const payload = {
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
                slots: [{ day: 'Tue' as const, dayparts: ['Afternoon' as const] }],
              },
            ],
          },
        ],
        roomItems: [],
      },
    };

    await sendWeek(payload);

    expect(fetchMock).toHaveBeenCalledWith('/api/send-week', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  });

  it('throws when the API rejects the request', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));

    await expect(
      sendWeek({
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
      })
    ).rejects.toThrow('Failed to send week');
  });
});

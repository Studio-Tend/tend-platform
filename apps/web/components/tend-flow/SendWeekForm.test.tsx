import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { track } from '@/lib/analytics';
import type { Focus } from '@tend/core';
import { resetPlanAnalyticsSession } from '@/lib/plan-analytics';
import { SendWeekForm } from './SendWeekForm';

const focuses: Focus[] = [
  {
    id: 'job',
    title: 'Career development',
    actions: [
      { id: 'a1', label: 'Finish case study', checked: true, slots: [{ day: 'Tue', dayparts: ['Afternoon'] }] },
      { id: 'a2', label: 'Reach out to Sarah', checked: true, slots: [] },
      { id: 'a3', label: 'Write cover letter', checked: true, slots: [{ day: 'Wed', dayparts: ['Morning'] }] },
      { id: 'a4', label: 'Update LinkedIn', checked: true, slots: [] },
    ],
  },
];

afterEach(() => {
  resetPlanAnalyticsSession();
  vi.mocked(track).mockClear();
  vi.unstubAllGlobals();
});

describe('SendWeekForm', () => {
  it('collapses the form when Cancel is pressed', async () => {
    const user = userEvent.setup();
    render(<SendWeekForm focuses={[]} roomItems={[]} />);

    await user.click(screen.getByRole('button', { name: 'Email this to me' }));
    expect(screen.getByLabelText('Where should we send your week?')).toBeInTheDocument();
    expect(screen.getByText("We'll only use this to send your week.")).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByRole('button', { name: 'Email this to me' })).toBeInTheDocument();
  });

  it('tracks send_week_clicked with the current session and action count', async () => {
    const user = userEvent.setup();
    render(<SendWeekForm focuses={focuses} roomItems={[]} />);

    await user.click(screen.getByRole('button', { name: 'Email this to me' }));

    expect(track).toHaveBeenCalledWith('send_week_clicked', {
      session_id: expect.any(String),
      action_count: 4,
    });
  });

  it('tracks week_email_submitted after the API accepts a valid request', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);
    render(<SendWeekForm focuses={focuses} roomItems={[]} />);

    await user.click(screen.getByRole('button', { name: 'Email this to me' }));
    await user.type(screen.getByLabelText('Where should we send your week?'), 'you@email.com');
    await user.click(screen.getByRole('button', { name: 'Send my week' }));

    expect(await screen.findByRole('link', { name: /Join the Tend waitlist/i })).toBeInTheDocument();
    expect(track).toHaveBeenCalledWith('week_email_submitted', {
      session_id: expect.any(String),
      marketing_opt_in: false,
    });
    expect(track).not.toHaveBeenCalledWith('week_email_sent', expect.anything());

    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string) as {
      email: string;
      plan: { focuses: unknown[]; roomItems: unknown[] };
      timeZone: string;
      session_id: string;
    };
    expect(body.email).toBe('you@email.com');
    expect(body.plan.focuses.length).toBeGreaterThan(0);
    expect(body.timeZone).toEqual(expect.any(String));
    expect(body.session_id).toEqual(expect.any(String));
  });

  it('tracks week_email_failed when the API rejects the request', async () => {
    const user = userEvent.setup();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
    render(<SendWeekForm focuses={focuses} roomItems={[]} />);

    await user.click(screen.getByRole('button', { name: 'Email this to me' }));
    await user.type(screen.getByLabelText('Where should we send your week?'), 'you@email.com');
    await user.click(screen.getByRole('button', { name: 'Send my week' }));

    expect(await screen.findByRole('alert')).toHaveTextContent("We couldn't send your week. Try again.");
    expect(track).toHaveBeenCalledWith('week_email_failed', {
      session_id: expect.any(String),
    });
  });

  it('says to wait rather than retry when the send was rate limited', async () => {
    const user = userEvent.setup();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 429 }));
    render(<SendWeekForm focuses={focuses} roomItems={[]} />);

    await user.click(screen.getByRole('button', { name: 'Email this to me' }));
    await user.type(screen.getByLabelText('Where should we send your week?'), 'you@email.com');
    await user.click(screen.getByRole('button', { name: 'Send my week' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      "You've sent your week a few times already. Try again a little later.",
    );
  });
});

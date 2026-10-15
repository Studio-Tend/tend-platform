import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { track } from '@/lib/analytics';
import { PLAN_SESSION_KEYS, resetPlanAnalyticsSession } from '@/lib/plan-analytics';
import { FORMSPREE_ENDPOINT, WaitlistForm, WaitlistNavLink } from './WaitlistForm';

afterEach(() => {
  resetPlanAnalyticsSession();
  vi.mocked(track).mockClear();
  vi.unstubAllGlobals();
});

describe('WaitlistNavLink', () => {
  it('tracks waitlist_clicked', async () => {
    const user = userEvent.setup();
    render(<WaitlistNavLink />);

    await user.click(screen.getByRole('link', { name: 'Join waitlist' }));

    expect(track).toHaveBeenCalledWith('waitlist_clicked', undefined);
  });

  it('includes a plan session when one already exists', async () => {
    sessionStorage.setItem(PLAN_SESSION_KEYS.sessionId, 'session-1');
    const user = userEvent.setup();
    render(<WaitlistNavLink />);

    await user.click(screen.getByRole('link', { name: 'Join waitlist' }));

    expect(track).toHaveBeenCalledWith('waitlist_clicked', { session_id: 'session-1' });
  });
});

describe('WaitlistForm', () => {
  it('tracks waitlist_submitted after Formspree accepts the signup', async () => {
    const user = userEvent.setup();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));
    render(<WaitlistForm />);

    await user.type(screen.getByLabelText('Email address'), 'you@email.com');
    await user.click(screen.getByRole('button', { name: 'Join the waitlist' }));

    expect(await screen.findByText("You're on the list. Talk soon.")).toBeInTheDocument();
    expect(track).toHaveBeenCalledWith('waitlist_submitted', undefined);
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(FORMSPREE_ENDPOINT, expect.anything());
  });

  it('does not track waitlist_submitted when the signup fails', async () => {
    const user = userEvent.setup();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
    render(<WaitlistForm />);

    await user.type(screen.getByLabelText('Email address'), 'you@email.com');
    await user.click(screen.getByRole('button', { name: 'Join the waitlist' }));

    expect(await screen.findByText('Something went wrong — mind trying again?')).toBeInTheDocument();
    expect(track).not.toHaveBeenCalled();
  });
});

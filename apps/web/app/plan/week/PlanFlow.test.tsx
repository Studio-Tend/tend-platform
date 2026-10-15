import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { seedFocuses, seedRoomItems } from '@/components/tend-flow/seed-data';
import { track } from '@/lib/analytics';
import { resetPlanAnalyticsSession } from '@/lib/plan-analytics';
import { encodePlanLink } from '@/lib/plan-link';
import { PlanFlow } from './PlanFlow';

afterEach(() => {
  window.history.replaceState(null, '', '/plan/week');
  resetPlanAnalyticsSession();
  vi.mocked(track).mockClear();
});

describe('PlanFlow', () => {
  it('opens the encoded seed plan on Your week and clears the hash', async () => {
    const encoded = await encodePlanLink({ focuses: seedFocuses(), roomItems: seedRoomItems() });
    window.history.replaceState(null, '', `/plan/week#w=${encoded}`);

    render(<PlanFlow />);

    expect(await screen.findByRole('heading', { name: 'Your week' })).toBeInTheDocument();
    expect(screen.getByText('Finish portfolio case study')).toBeInTheDocument();
    expect(screen.getByText('Dinner with friends')).toBeInTheDocument();
    await waitFor(() => {
      expect(window.location.hash).toBe('');
    });
  });

  it('reports a reopen from the week email, keeping its source', async () => {
    const encoded = await encodePlanLink({ focuses: seedFocuses(), roomItems: seedRoomItems() });
    window.history.replaceState(null, '', `/plan/week?source=week_email#w=${encoded}`);

    render(<PlanFlow />);

    expect(await screen.findByRole('heading', { name: 'Your week' })).toBeInTheDocument();
    expect(track).toHaveBeenCalledWith(
      'weekly_plan_reopened',
      expect.objectContaining({ source: 'week_email', focus_count: seedFocuses().length }),
    );
    expect(window.location.search).toBe('?source=week_email');
    expect(track).not.toHaveBeenCalledWith('plan_link_invalid', expect.anything());
  });

  it('marks a completion after reopening and editing as from the reopen link', async () => {
    const user = userEvent.setup();
    const encoded = await encodePlanLink({ focuses: seedFocuses(), roomItems: seedRoomItems() });
    window.history.replaceState(null, '', `/plan/week?source=week_email#w=${encoded}`);

    render(<PlanFlow />);
    expect(await screen.findByRole('heading', { name: 'Your week' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '‹ Back' }));
    await user.click(screen.getByRole('button', { name: 'See your week' }));

    expect(track).not.toHaveBeenCalledWith('weekly_plan_started', expect.anything());
    expect(track).toHaveBeenCalledWith(
      'weekly_plan_completed',
      expect.objectContaining({ from_reopen_link: true }),
    );
  });

  it('starts empty when the hash is garbage', async () => {
    window.history.replaceState(null, '', '/plan/week#w=not-valid');

    render(<PlanFlow />);

    expect(await screen.findByRole('heading', { name: 'What are you tending to this week?' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Your week' })).not.toBeInTheDocument();
    expect(track).toHaveBeenCalledWith('plan_link_invalid', expect.anything());
    expect(track).not.toHaveBeenCalledWith('weekly_plan_reopened', expect.anything());
  });

  it('reports neither reopen event on a plain visit', async () => {
    render(<PlanFlow />);

    expect(await screen.findByRole('heading', { name: 'What are you tending to this week?' })).toBeInTheDocument();
    expect(track).not.toHaveBeenCalledWith('weekly_plan_reopened', expect.anything());
    expect(track).not.toHaveBeenCalledWith('plan_link_invalid', expect.anything());
  });
});

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { track } from '@/lib/analytics';
import { resetPlanAnalyticsSession } from '@/lib/plan-analytics';
import { TendFlow } from './TendFlow';

afterEach(() => {
  resetPlanAnalyticsSession();
  vi.mocked(track).mockClear();
});

async function continueTimes(user: ReturnType<typeof userEvent.setup>, times: number) {
  for (let i = 0; i < times; i += 1) {
    await user.click(screen.getByRole('button', { name: 'Continue' }));
  }
}

describe('TendFlow', () => {
  it('focuses the add field when Continue opens the next step', async () => {
    const user = userEvent.setup();
    render(<TendFlow />);

    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByLabelText('Add an action')).toHaveFocus();

    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByText(/Focus 2 of 3/i)).toBeInTheDocument();
    expect(screen.getByLabelText('Add an action')).toHaveFocus();

    await continueTimes(user, 3);
    expect(screen.getByRole('heading', { name: 'What do you want to make room for?' })).toBeInTheDocument();
    expect(screen.getByLabelText('Add something to make room for')).toHaveFocus();
  });

  it('does not carry an unsent action draft to the next focus', async () => {
    const user = userEvent.setup();
    render(<TendFlow />);

    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await user.type(screen.getByLabelText('Add an action'), 'leftover draft');
    await user.click(screen.getByRole('button', { name: 'Continue' }));

    expect(screen.getByLabelText('Add an action')).toHaveValue('');
    expect(screen.getByText(/Focus 2 of 3/i)).toBeInTheDocument();
  });

  it('does not treat landing on an empty planner as a start', () => {
    render(<TendFlow startEmpty />);
    expect(track).not.toHaveBeenCalledWith('weekly_plan_started', expect.anything());
  });

  it('fires weekly_plan_started when the first focus is added', async () => {
    const user = userEvent.setup();
    render(<TendFlow startEmpty />);

    await user.type(screen.getByLabelText('Add a focus'), 'Health');
    await user.click(screen.getByRole('button', { name: 'Add' }));

    expect(track).toHaveBeenCalledWith('weekly_plan_started', {
      session_id: expect.any(String),
      source: 'direct',
      device_type: 'desktop',
    });
  });

  it('fires weekly_plan_started when the user continues from the first step', async () => {
    const user = userEvent.setup();
    render(<TendFlow />);

    expect(track).not.toHaveBeenCalledWith('weekly_plan_started', expect.anything());
    await user.click(screen.getByRole('button', { name: 'Continue' }));

    expect(track).toHaveBeenCalledWith('weekly_plan_started', {
      session_id: expect.any(String),
      source: 'direct',
      device_type: 'desktop',
    });
  });

  it('fires weekly_plan_completed on the finished plan screen', async () => {
    const user = userEvent.setup();
    render(<TendFlow />);

    await continueTimes(user, 5);
    await user.click(screen.getByRole('button', { name: 'See your week' }));

    expect(screen.getByRole('heading', { name: 'Your week' })).toBeInTheDocument();
    expect(track).toHaveBeenCalledWith('weekly_plan_completed', {
      session_id: expect.any(String),
      focus_count: 3,
      action_count: 4,
      scheduled_action_count: 3,
      unscheduled_action_count: 1,
      from_reopen_link: false,
      active_seconds: expect.any(Number),
    });
  });

  it('fires plan_step_viewed for each step, with the focus on actions', async () => {
    const user = userEvent.setup();
    render(<TendFlow />);

    await continueTimes(user, 5);
    await user.click(screen.getByRole('button', { name: 'See your week' }));

    const viewed = vi
      .mocked(track)
      .mock.calls.filter(([name]) => name === 'plan_step_viewed')
      .map(([, properties]) => [properties?.step, properties?.focus_index]);
    expect(viewed).toEqual([
      ['focuses', undefined],
      ['actions', 0],
      ['actions', 1],
      ['actions', 2],
      ['prioritize', undefined],
      ['makeRoom', undefined],
      ['yourWeek', undefined],
    ]);
  });

  it('fires action_scheduled when an action is given a day', async () => {
    const user = userEvent.setup();
    render(<TendFlow />);

    await continueTimes(user, 4);
    expect(screen.getByRole('heading', { name: 'What matters most this week?' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '+ Add a time' }));
    await user.click(screen.getByRole('button', { name: 'Mon' }));

    expect(track).toHaveBeenCalledWith('action_scheduled', {
      session_id: expect.any(String),
    });
  });

  it('does not fire weekly_plan_completed for an empty plan', async () => {
    const user = userEvent.setup();
    render(<TendFlow startEmpty />);

    await user.type(screen.getByLabelText('Add a focus'), 'Health');
    await user.click(screen.getByRole('button', { name: 'Add' }));
    await continueTimes(user, 3);
    await user.click(screen.getByRole('button', { name: 'See your week' }));

    expect(screen.getByRole('heading', { name: 'Your week' })).toBeInTheDocument();
    expect(track).not.toHaveBeenCalledWith('weekly_plan_completed', expect.anything());
  });

  it('keeps an unscheduled copy as its own item when you leave Your week', async () => {
    const user = userEvent.setup();
    render(
      <TendFlow
        initialStep="yourWeek"
        initialPlan={{
          focuses: [
            {
              id: 'job',
              title: 'Job',
              actions: [
                { id: 'study', label: 'Study', checked: true, slots: [{ day: 'Mon', dayparts: ['Morning'] }] },
              ],
            },
          ],
          roomItems: [{ id: 'rest', label: 'Rest', slots: [{ day: 'Mon', dayparts: [] }] }],
        }}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Edit week' }));
    await user.click(screen.getByRole('button', { name: 'Study, Mon morning. Job' }));
    await user.click(screen.getByRole('button', { name: 'Duplicate to...' }));
    await user.click(screen.getByRole('button', { name: 'Unscheduled' }));
    await user.click(screen.getByRole('button', { name: 'Add copy' }));

    await user.click(screen.getByRole('button', { name: 'Rest, Mon anytime' }));
    await user.click(screen.getByRole('button', { name: 'Duplicate to...' }));
    await user.click(screen.getByRole('button', { name: 'Unscheduled' }));
    await user.click(screen.getByRole('button', { name: 'Add copy' }));

    await user.click(screen.getByRole('button', { name: '‹ Back' }));
    expect(screen.getByRole('heading', { name: 'What do you want to make room for?' })).toBeInTheDocument();
    expect(screen.getAllByLabelText('Edit Rest')).toHaveLength(2);

    await user.click(screen.getByRole('button', { name: '‹ Back' }));
    expect(screen.getByRole('heading', { name: 'What matters most this week?' })).toBeInTheDocument();
    expect(screen.getAllByLabelText('Edit Study')).toHaveLength(2);
  });

  it('returns to an empty first step when the week is started over', async () => {
    const user = userEvent.setup();
    render(<TendFlow />);

    await continueTimes(user, 5);
    await user.click(screen.getByRole('button', { name: 'See your week' }));

    await user.click(screen.getByRole('button', { name: 'Start this week over' }));
    await user.click(await screen.findByRole('button', { name: 'Start over' }));

    expect(screen.getByRole('heading', { name: 'What are you tending to this week?' })).toBeInTheDocument();
    expect(screen.queryByText('Career development')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
  });

  it('counts the plan after a start over as a new plan', async () => {
    const user = userEvent.setup();
    render(<TendFlow />);

    await continueTimes(user, 5);
    await user.click(screen.getByRole('button', { name: 'See your week' }));
    await user.click(screen.getByRole('button', { name: 'Start this week over' }));
    await user.click(await screen.findByRole('button', { name: 'Start over' }));

    expect(track).toHaveBeenCalledWith('plan_started_over', {
      session_id: expect.any(String),
      step: 'yourWeek',
    });

    vi.mocked(track).mockClear();
    await user.type(screen.getByLabelText('Add a focus'), 'Health');
    await user.click(screen.getByRole('button', { name: 'Add' }));

    expect(track).toHaveBeenCalledWith('weekly_plan_started', expect.anything());
  });
});

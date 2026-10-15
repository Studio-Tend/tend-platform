import { afterEach, describe, expect, it, vi } from 'vitest';
import { track } from '@/lib/analytics';
import {
  getPlanSessionId,
  hasValidPlan,
  PLAN_SESSION_KEYS,
  planActionCounts,
  planDeviceType,
  planSource,
  resetPlanAnalyticsSession,
  trackNewlyScheduledActions,
  trackPlanLinkInvalid,
  trackPlanStartedOver,
  trackPlanStepViewed,
  trackWeeklyPlanCompleted,
  trackWeeklyPlanReopened,
  trackWeeklyPlanStarted,
  notePlanVisibility,
  watchPlanVisibility,
} from './plan-analytics';
import type { Focus } from '@tend/core';

const focuses: Focus[] = [
  {
    id: 'job',
    title: 'Career development',
    actions: [
      { id: 'a1', label: 'Finish case study', checked: true, slots: [{ day: 'Tue', dayparts: ['Afternoon'] }] },
      { id: 'a2', label: 'Reach out to Sarah', checked: true, slots: [] },
      { id: 'a3', label: 'Skip this', checked: false, slots: [{ day: 'Mon', dayparts: ['Morning'] }] },
      { id: 'a4', label: '   ', checked: true, slots: [{ day: 'Wed', dayparts: ['Morning'] }] },
    ],
  },
];

afterEach(() => {
  resetPlanAnalyticsSession();
  vi.mocked(track).mockClear();
});

describe('planActionCounts', () => {
  it('counts selected labeled actions and whether they have a day', () => {
    expect(planActionCounts(focuses)).toEqual({
      focus_count: 1,
      action_count: 2,
      scheduled_action_count: 1,
      unscheduled_action_count: 1,
    });
  });

  it('treats a plan with no selected actions as invalid', () => {
    expect(hasValidPlan([])).toBe(false);
    expect(hasValidPlan(focuses)).toBe(true);
  });
});

describe('planSource', () => {
  it('prefers source, then utm_source, then an external referrer', () => {
    expect(planSource('?source=tiktok&utm_source=ig', 'https://google.com', 'heytend.co')).toBe('tiktok');
    expect(planSource('?utm_source=newsletter', 'https://google.com', 'heytend.co')).toBe('newsletter');
    expect(planSource('', 'https://www.instagram.com/p/1', 'heytend.co')).toBe('www.instagram.com');
    expect(planSource('', 'https://heytend.co/', 'heytend.co')).toBe('direct');
    expect(planSource('', '', 'heytend.co')).toBe('direct');
  });
});

describe('planDeviceType', () => {
  it('classifies common user agents', () => {
    expect(planDeviceType('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile')).toBe('mobile');
    expect(planDeviceType('Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)')).toBe('tablet');
    expect(planDeviceType('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 5)).toBe('tablet');
    expect(planDeviceType('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 0)).toBe('desktop');
  });
});

describe('plan session events', () => {
  it('fires started once per session', () => {
    trackWeeklyPlanStarted();
    trackWeeklyPlanStarted();

    expect(track).toHaveBeenCalledTimes(1);
    expect(track).toHaveBeenCalledWith('weekly_plan_started', {
      session_id: expect.any(String),
      source: 'direct',
      device_type: 'desktop',
    });
  });

  it('fires completed once, and only for a valid plan', () => {
    trackWeeklyPlanCompleted([]);
    expect(track).not.toHaveBeenCalled();

    trackWeeklyPlanCompleted(focuses);
    trackWeeklyPlanCompleted(focuses);

    expect(track).toHaveBeenCalledTimes(1);
    expect(track).toHaveBeenCalledWith('weekly_plan_completed', {
      session_id: expect.any(String),
      focus_count: 1,
      action_count: 2,
      scheduled_action_count: 1,
      unscheduled_action_count: 1,
      from_reopen_link: false,
    });
  });
});

describe('active planning time', () => {
  const T0 = 1_800_000_000_000;
  const MINUTE = 60_000;
  const DAY = 24 * 60 * MINUTE;

  function completedActiveSeconds(): unknown {
    const call = vi.mocked(track).mock.calls.find(([name]) => name === 'weekly_plan_completed');
    return call?.[1]?.active_seconds;
  }

  it('counts the time the tab was visible', () => {
    trackWeeklyPlanStarted(T0);
    trackWeeklyPlanCompleted(focuses, T0 + 3 * MINUTE + 4_400);

    expect(completedActiveSeconds()).toBe(184);
  });

  it('does not count two days in a background tab', () => {
    trackWeeklyPlanStarted(T0);
    notePlanVisibility(false, T0 + 2 * MINUTE);
    notePlanVisibility(true, T0 + 2 * DAY);
    trackWeeklyPlanCompleted(focuses, T0 + 2 * DAY + 3 * MINUTE);

    expect(completedActiveSeconds()).toBe(5 * 60);
  });

  it('ignores repeated visibility signals', () => {
    trackWeeklyPlanStarted(T0);
    notePlanVisibility(true, T0 + MINUTE);
    notePlanVisibility(false, T0 + 2 * MINUTE);
    notePlanVisibility(false, T0 + 10 * MINUTE);
    notePlanVisibility(true, T0 + 20 * MINUTE);
    notePlanVisibility(true, T0 + 21 * MINUTE);
    trackWeeklyPlanCompleted(focuses, T0 + 22 * MINUTE);

    expect(completedActiveSeconds()).toBe(4 * 60);
  });

  it('does nothing before the plan starts', () => {
    notePlanVisibility(true, T0);
    notePlanVisibility(false, T0 + DAY);
    expect(sessionStorage.getItem(PLAN_SESSION_KEYS.activeMs)).toBeNull();
  });

  it('leaves active time out when the plan never started in this session', () => {
    trackWeeklyPlanCompleted(focuses);

    const [, properties] = vi.mocked(track).mock.lastCall ?? [];
    expect(properties).not.toHaveProperty('active_seconds');
  });

  it('keeps counting through a reload in the same tab', () => {
    const cleanupBefore = watchPlanVisibility();
    trackWeeklyPlanStarted();
    window.dispatchEvent(new Event('pagehide'));
    cleanupBefore();
    expect(sessionStorage.getItem(PLAN_SESSION_KEYS.activeSince)).toBeNull();

    const cleanupAfter = watchPlanVisibility();
    expect(sessionStorage.getItem(PLAN_SESSION_KEYS.activeSince)).not.toBeNull();
    cleanupAfter();
  });
});

describe('completions after a reopen', () => {
  it('marks a completion that started from the reopen link', () => {
    trackWeeklyPlanReopened(focuses);
    trackWeeklyPlanCompleted(focuses);

    expect(track).toHaveBeenLastCalledWith(
      'weekly_plan_completed',
      expect.objectContaining({ from_reopen_link: true }),
    );
  });

  it('marks a fresh plan as not from the reopen link', () => {
    trackWeeklyPlanStarted();
    trackWeeklyPlanCompleted(focuses);

    expect(track).toHaveBeenLastCalledWith(
      'weekly_plan_completed',
      expect.objectContaining({ from_reopen_link: false }),
    );
  });
});

describe('plan_step_viewed', () => {
  it('names the step, its number, which focus on actions, and the breakdown properties', () => {
    trackPlanStepViewed('actions', 2, 1);
    trackPlanStepViewed('prioritize', 3);

    expect(track).toHaveBeenNthCalledWith(1, 'plan_step_viewed', {
      session_id: expect.any(String),
      source: 'direct',
      device_type: 'desktop',
      step: 'actions',
      step_number: 2,
      focus_index: 1,
    });
    expect(track).toHaveBeenNthCalledWith(2, 'plan_step_viewed', {
      session_id: expect.any(String),
      source: 'direct',
      device_type: 'desktop',
      step: 'prioritize',
      step_number: 3,
      focus_index: undefined,
    });
  });
});

describe('reopen link events', () => {
  it('reports a reopened week with its source and size', () => {
    window.history.replaceState(null, '', '/plan/week?source=week_email');
    trackWeeklyPlanReopened(focuses);
    window.history.replaceState(null, '', '/');

    expect(track).toHaveBeenCalledWith('weekly_plan_reopened', {
      session_id: expect.any(String),
      source: 'week_email',
      device_type: 'desktop',
      focus_count: 1,
      action_count: 2,
      scheduled_action_count: 1,
      unscheduled_action_count: 1,
    });
  });

  it('reports a link that could not be read', () => {
    trackPlanLinkInvalid();
    expect(track).toHaveBeenCalledWith('plan_link_invalid', {
      session_id: expect.any(String),
      source: 'direct',
    });
  });
});

describe('trackPlanStartedOver', () => {
  it('reports the old session, then lets the next plan count as new', () => {
    trackWeeklyPlanStarted();
    trackWeeklyPlanCompleted(focuses);
    const firstSession = getPlanSessionId();

    trackPlanStartedOver('yourWeek');
    expect(track).toHaveBeenLastCalledWith('plan_started_over', {
      session_id: firstSession,
      step: 'yourWeek',
    });

    vi.mocked(track).mockClear();
    trackWeeklyPlanStarted();
    trackWeeklyPlanCompleted(focuses);

    const names = vi.mocked(track).mock.calls.map(([name]) => name);
    expect(names).toEqual(['weekly_plan_started', 'weekly_plan_completed']);
    expect(getPlanSessionId()).not.toBe(firstSession);
  });
});

describe('trackNewlyScheduledActions', () => {
  it('fires once when an action first gets a day', () => {
    const next: Focus[] = [
      {
        ...focuses[0],
        actions: focuses[0].actions.map((action) =>
          action.id === 'a2' ? { ...action, slots: [{ day: 'Mon', dayparts: [] }] } : action,
        ),
      },
    ];

    trackNewlyScheduledActions(focuses, next);

    expect(track).toHaveBeenCalledTimes(1);
    expect(track).toHaveBeenCalledWith('action_scheduled', {
      session_id: expect.any(String),
    });
  });

  it('does not fire when a scheduled action changes time or is unscheduled', () => {
    const retimed: Focus[] = [
      {
        ...focuses[0],
        actions: focuses[0].actions.map((action) =>
          action.id === 'a1' ? { ...action, slots: [{ day: 'Wed', dayparts: ['Morning'] }] } : action,
        ),
      },
    ];
    trackNewlyScheduledActions(focuses, retimed);
    expect(track).not.toHaveBeenCalled();

    const cleared: Focus[] = [
      {
        ...focuses[0],
        actions: focuses[0].actions.map((action) => (action.id === 'a1' ? { ...action, slots: [] } : action)),
      },
    ];
    trackNewlyScheduledActions(focuses, cleared);
    expect(track).not.toHaveBeenCalled();
  });
});

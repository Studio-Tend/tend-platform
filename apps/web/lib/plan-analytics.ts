import type { Focus } from '@tend/core';
import { track } from './analytics';
import { PLAN_EVENTS } from './plan-events';

export { PLAN_EVENTS };

export const PLAN_SESSION_KEYS = {
  sessionId: 'tend.plan.session_id',
  started: 'tend.plan.started',
  /** Visible milliseconds counted so far. Present once the plan has started. */
  activeMs: 'tend.plan.active_ms',
  /** When the current visible stretch began. Absent while the tab is hidden. */
  activeSince: 'tend.plan.active_since',
  /** Set when this session opened a week from the email's reopen link. */
  reopened: 'tend.plan.reopened',
  completed: 'tend.plan.completed',
} as const;

export type DeviceType = 'mobile' | 'tablet' | 'desktop';

export type PlanActionCounts = {
  focus_count: number;
  action_count: number;
  scheduled_action_count: number;
  unscheduled_action_count: number;
};

export function getPlanSessionId(): string {
  try {
    const existing = sessionStorage.getItem(PLAN_SESSION_KEYS.sessionId);
    if (existing) return existing;
    const id = crypto.randomUUID();
    sessionStorage.setItem(PLAN_SESSION_KEYS.sessionId, id);
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

export function planSource(
  search = typeof window === 'undefined' ? '' : window.location.search,
  referrer = typeof document === 'undefined' ? '' : document.referrer,
  pageHost = typeof window === 'undefined' ? '' : window.location.hostname
): string {
  const params = new URLSearchParams(search);
  const explicit = params.get('source') ?? params.get('utm_source');
  if (explicit?.trim()) return explicit.trim().slice(0, 255);

  if (referrer) {
    try {
      const host = new URL(referrer).hostname;
      if (host && host !== pageHost) return host.slice(0, 255);
    } catch {
      // Ignore malformed referrers.
    }
  }

  return 'direct';
}

export function planDeviceType(
  userAgent = typeof navigator === 'undefined' ? '' : navigator.userAgent,
  maxTouchPoints = typeof navigator === 'undefined' ? 0 : navigator.maxTouchPoints
): DeviceType {
  if (/iPad|Tablet/i.test(userAgent)) return 'tablet';
  if (/Mobi|Android/i.test(userAgent)) return 'mobile';
  if (maxTouchPoints > 1 && /Macintosh/i.test(userAgent)) return 'tablet';
  return 'desktop';
}

export function planActionCounts(focuses: Focus[]): PlanActionCounts {
  const selected = focuses.flatMap((focus) =>
    focus.actions.filter((action) => action.checked && action.label.trim())
  );
  const scheduled = selected.filter((action) => action.slots.length > 0);
  return {
    focus_count: focuses.length,
    action_count: selected.length,
    scheduled_action_count: scheduled.length,
    unscheduled_action_count: selected.length - scheduled.length,
  };
}

export function actionsGainingASlot(previous: Focus[], next: Focus[]): string[] {
  const hadSlot = new Map(
    previous.flatMap((focus) => focus.actions.map((action) => [action.id, action.slots.length > 0] as const)),
  );
  return next
    .flatMap((focus) => focus.actions)
    .filter((action) => action.slots.length > 0 && hadSlot.get(action.id) !== true)
    .map((action) => action.id);
}

/** Fires once per action that just received its first day. */
export function trackNewlyScheduledActions(previous: Focus[], next: Focus[]): void {
  const gained = actionsGainingASlot(previous, next);
  if (gained.length === 0) return;
  const session_id = getPlanSessionId();
  gained.forEach(() => {
    track(PLAN_EVENTS.actionScheduled, { session_id });
  });
}

export function hasValidPlan(focuses: Focus[]): boolean {
  return planActionCounts(focuses).action_count > 0;
}

/**
 * Fires each time a planner step is shown, including going back. On the
 * actions step, `focusIndex` says which focus (0-based) is being brainstormed.
 */
export function trackPlanStepViewed(step: string, stepNumber: number, focusIndex?: number): void {
  track(PLAN_EVENTS.stepViewed, {
    session_id: getPlanSessionId(),
    // Repeated here so a funnel that starts at this event can be broken down
    // by them; PostHog reads breakdowns from the first step.
    source: planSource(),
    device_type: planDeviceType(),
    step,
    step_number: stepNumber,
    focus_index: focusIndex,
  });
}

export function trackWeeklyPlanStarted(now = Date.now()): void {
  if (!claimOnce(PLAN_SESSION_KEYS.started)) return;
  startActiveTime(now);
  track(PLAN_EVENTS.started, {
    session_id: getPlanSessionId(),
    source: planSource(),
    device_type: planDeviceType(),
  });
}

/** Fires once per session when the finished plan screen is shown, if the plan has actions. */
export function trackWeeklyPlanCompleted(focuses: Focus[], now = Date.now()): void {
  if (!hasValidPlan(focuses)) return;
  if (!claimOnce(PLAN_SESSION_KEYS.completed)) return;
  const active_seconds = activeSeconds(now);
  track(PLAN_EVENTS.completed, {
    session_id: getPlanSessionId(),
    ...planActionCounts(focuses),
    from_reopen_link: readFlag(PLAN_SESSION_KEYS.reopened),
    ...(active_seconds === undefined ? {} : { active_seconds }),
  });
}

/** A saved week was restored from the email's reopen link. */
export function trackWeeklyPlanReopened(focuses: Focus[]): void {
  setFlag(PLAN_SESSION_KEYS.reopened);
  track(PLAN_EVENTS.reopened, {
    session_id: getPlanSessionId(),
    source: planSource(),
    device_type: planDeviceType(),
    ...planActionCounts(focuses),
  });
}

/** A reopen link was present but could not be decoded, so the planner started empty. */
export function trackPlanLinkInvalid(): void {
  track(PLAN_EVENTS.linkInvalid, {
    session_id: getPlanSessionId(),
    source: planSource(),
  });
}

/**
 * Records a confirmed "start over", then begins a new analytics session so
 * the next plan fires its own started and completed events.
 */
export function trackPlanStartedOver(step: string): void {
  track(PLAN_EVENTS.startedOver, { session_id: getPlanSessionId(), step });
  resetPlanAnalyticsSession();
}

export function existingPlanSessionId(): string | undefined {
  try {
    return sessionStorage.getItem(PLAN_SESSION_KEYS.sessionId) ?? undefined;
  } catch {
    return undefined;
  }
}

export function waitlistEventProperties(): { session_id: string } | undefined {
  const session_id = existingPlanSessionId();
  return session_id ? { session_id } : undefined;
}

export function resetPlanAnalyticsSession(): void {
  try {
    sessionStorage.removeItem(PLAN_SESSION_KEYS.sessionId);
    sessionStorage.removeItem(PLAN_SESSION_KEYS.started);
    sessionStorage.removeItem(PLAN_SESSION_KEYS.activeMs);
    sessionStorage.removeItem(PLAN_SESSION_KEYS.activeSince);
    sessionStorage.removeItem(PLAN_SESSION_KEYS.reopened);
    sessionStorage.removeItem(PLAN_SESSION_KEYS.completed);
  } catch {
    // Private mode / missing storage.
  }
}

// Planning time counts only while the tab is visible, so a tab left in the
// background for two days does not report two days of planning. It lives in
// sessionStorage so a reload mid-plan keeps the time already counted.

function pageIsVisible(): boolean {
  return typeof document === 'undefined' || document.visibilityState === 'visible';
}

function startActiveTime(now: number): void {
  try {
    sessionStorage.setItem(PLAN_SESSION_KEYS.activeMs, '0');
    if (pageIsVisible()) sessionStorage.setItem(PLAN_SESSION_KEYS.activeSince, String(now));
    else sessionStorage.removeItem(PLAN_SESSION_KEYS.activeSince);
  } catch {
    // Active time is optional; the events still fire without it.
  }
}

/**
 * Records the tab becoming visible or hidden. Does nothing until the plan has
 * started. Exported for tests; the planner calls it through watchPlanVisibility.
 */
export function notePlanVisibility(visible: boolean, now = Date.now()): void {
  try {
    const counted = sessionStorage.getItem(PLAN_SESSION_KEYS.activeMs);
    if (counted === null) return;
    const since = Number(sessionStorage.getItem(PLAN_SESSION_KEYS.activeSince));
    const running = Number.isFinite(since) && since > 0 && since <= now;

    if (visible) {
      if (!running) sessionStorage.setItem(PLAN_SESSION_KEYS.activeSince, String(now));
      return;
    }

    if (running) {
      sessionStorage.setItem(PLAN_SESSION_KEYS.activeMs, String(Number(counted) + (now - since)));
    }
    sessionStorage.removeItem(PLAN_SESSION_KEYS.activeSince);
  } catch {
    // Private mode / missing storage.
  }
}

/** Counts planning time only while the tab is visible. Returns a cleanup. */
export function watchPlanVisibility(): () => void {
  if (typeof document === 'undefined' || typeof window === 'undefined') return () => {};
  const onVisibility = () => notePlanVisibility(document.visibilityState === 'visible');
  const onPageHide = () => notePlanVisibility(false);
  // A reload ends the last stretch on pagehide; this restarts it.
  onVisibility();
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('pagehide', onPageHide);
  return () => {
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('pagehide', onPageHide);
  };
}

/** Whole visible seconds since this session's plan started, or undefined if unknown. */
function activeSeconds(now: number): number | undefined {
  try {
    const counted = sessionStorage.getItem(PLAN_SESSION_KEYS.activeMs);
    if (counted === null) return undefined;
    const since = Number(sessionStorage.getItem(PLAN_SESSION_KEYS.activeSince));
    const running = Number.isFinite(since) && since > 0 && since <= now ? now - since : 0;
    const total = Number(counted) + running;
    return Number.isFinite(total) && total >= 0 ? Math.round(total / 1000) : undefined;
  } catch {
    return undefined;
  }
}

function setFlag(key: string): void {
  try {
    sessionStorage.setItem(key, '1');
  } catch {
    // Private mode / missing storage.
  }
}

function readFlag(key: string): boolean {
  try {
    return sessionStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

function claimOnce(key: string): boolean {
  try {
    if (sessionStorage.getItem(key) === '1') return false;
    sessionStorage.setItem(key, '1');
    return true;
  } catch {
    return true;
  }
}

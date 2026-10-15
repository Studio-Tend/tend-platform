'use client';

import { useEffect, useState } from 'react';
import type { PlanState } from '@tend/core';
import { TendFlow } from '@/components/tend-flow/TendFlow';
import { usePlanSession } from '@/components/tend-flow/plan-session';
import { trackPlanLinkInvalid, trackWeeklyPlanReopened } from '@/lib/plan-analytics';
import { decodePlanLink } from '@/lib/plan-link';

/**
 * Client boundary for the planner, so `app/plan/week/page.tsx` can stay a server
 * component and export metadata.
 *
 * On mount, a `#w=` fragment (from the week email) restores that plan and
 * lands on "Your week". The hash is then cleared so later edits are not
 * mistaken for editing the link. In local development, a sample week loads
 * the same way unless the page is opened with `?empty`.
 */
export function PlanFlow() {
  const session = usePlanSession();
  const hydrated = session?.hydrated ?? false;
  const hydrate = session?.hydrate;
  const [restored, setRestored] = useState(false);
  const [initialPlan, setInitialPlan] = useState<PlanState | null>(null);
  const ready = hydrated || restored;

  useEffect(() => {
    if (hydrated) return;

    let cancelled = false;

    const restore = async () => {
      const hash = window.location.hash.startsWith('#')
        ? window.location.hash.slice(1)
        : window.location.hash;
      const encoded = new URLSearchParams(hash).get('w');
      let plan = encoded ? await decodePlanLink(encoded) : null;

      if (encoded && !cancelled) {
        if (plan) trackWeeklyPlanReopened(plan.focuses);
        else trackPlanLinkInvalid();
      }

      // Dev-only sample week, so a refresh doesn't mean rebuilding the plan.
      // A real reopen link still wins. `?empty` keeps the blank planner.
      // The env check stays outside the import so production builds omit the sample.
      if (!plan && process.env.NODE_ENV === 'development') {
        const { mockWeekPlan, shouldLoadDevMock } = await import('@/components/tend-flow/mock-week');
        if (shouldLoadDevMock(process.env.NODE_ENV, window.location.search)) {
          plan = mockWeekPlan();
        }
      }

      if (window.location.hash) {
        history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
      }

      if (!cancelled) {
        hydrate?.(plan, plan ? 'yourWeek' : 'focuses');
        setInitialPlan(plan);
        setRestored(true);
      }
    };

    void restore();
    return () => {
      cancelled = true;
    };
  }, [hydrate, hydrated]);

  if (!ready) return null;

  return (
    // No onComplete: the send and its analytics already happen inside
    // SendWeekForm, and the plan must not be echoed anywhere client-side.
    <TendFlow
      startEmpty
      initialPlan={initialPlan ?? undefined}
      initialStep={initialPlan ? 'yourWeek' : undefined}
    />
  );
}

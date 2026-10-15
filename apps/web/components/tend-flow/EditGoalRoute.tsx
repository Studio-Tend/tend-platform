'use client';

import { useSyncExternalStore } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { EditGoal } from './EditGoal';
import { replaceFocus } from './edit-goal';
import { usePlanSession } from './plan-session';

function useHasMounted(): boolean {
  return useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );
}

export function EditGoalRoute() {
  const params = useParams<{ goalId: string }>();
  const router = useRouter();
  const session = usePlanSession();
  const ready = useHasMounted();
  const goalId = typeof params.goalId === 'string' ? params.goalId : '';
  const goal = session?.hydrated ? session.focuses.find((focus) => focus.id === goalId) : undefined;

  const close = () => {
    router.push('/plan/week');
  };

  if (!ready) {
    return (
      <div className="tend-flow">
        <p className="tend-goal-editor__status" role="status">
          Loading goal.
        </p>
      </div>
    );
  }

  if (!goal || !session) {
    return (
      <div className="tend-flow">
        <div className="tend-goal-editor__frame">
          <header className="tend-goal-editor__header">
            <h1 className="tend-goal-editor__title">Edit goal</h1>
          </header>
          <div className="tend-goal-editor__body">
            <p>This goal isn't in your week.</p>
            <Link href="/plan/week" className="tend-inline-link">
              Back to your week
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="tend-flow">
      <EditGoal
        goal={goal}
        closeLabel="Back"
        onSave={(next) => {
          session.setFocuses((current) => replaceFocus(current, next));
          close();
        }}
        onClose={close}
      />
    </div>
  );
}

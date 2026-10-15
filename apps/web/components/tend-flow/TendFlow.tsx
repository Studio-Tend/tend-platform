'use client';

import { useEffect, useRef, useState, type SetStateAction } from 'react';
import './tend-flow.css';
import { FocusesStep } from './FocusesStep';
import { ActionsStep } from './ActionsStep';
import { PrioritizeStep } from './PrioritizeStep';
import { MakeRoomStep } from './MakeRoomStep';
import { YourWeekStep } from './YourWeekStep';
import { seedFocuses, seedRoomItems } from './seed-data';
import {
  trackNewlyScheduledActions,
  trackPlanStartedOver,
  trackPlanStepViewed,
  trackWeeklyPlanCompleted,
  trackWeeklyPlanStarted,
  watchPlanVisibility,
} from '@/lib/plan-analytics';
import { assignFocusColors, type ActionItem, type Focus, type RoomItem } from '@tend/core';
import { STEP_NUMBER, type TendStep } from './flow-steps';
import { usePlanSession } from './plan-session';

interface TendFlowProps {
  /** Called once the week email has been sent from the final screen. */
  onComplete?: (result: { focuses: Focus[]; roomItems: RoomItem[]; email: string }) => void;
  /** Start empty instead of the walkthrough's example data. */
  startEmpty?: boolean;
  /** Restore a plan (e.g. from a reopen link). Wins over startEmpty / seed data. */
  initialPlan?: { focuses: Focus[]; roomItems: RoomItem[] };
  /** Land on a step other than focuses. Used when reopening a week. */
  initialStep?: TendStep;
}

/**
 * The full Focuses → Actions → Prioritize → Make room → Your week flow,
 * with state shared across all five steps (unlike the design-canvas
 * prototype, where each screen was its own isolated file). Drop this into a
 * client route and wire `onComplete` up to your persistence layer.
 */
export function TendFlow({ onComplete, startEmpty, initialPlan, initialStep }: TendFlowProps) {
  const session = usePlanSession();
  const usingSession = Boolean(session?.hydrated);
  const [localFocuses, setLocalFocuses] = useState<Focus[]>(
    initialPlan?.focuses ?? (startEmpty ? [] : seedFocuses()),
  );
  const [localRoomItems, setLocalRoomItems] = useState<RoomItem[]>(
    initialPlan?.roomItems ?? (startEmpty ? [] : seedRoomItems()),
  );
  const [localStep, setLocalStep] = useState<TendStep>(initialStep ?? 'focuses');
  const [localActionsIndex, setLocalActionsIndex] = useState(0);
  const focuses = usingSession && session ? session.focuses : localFocuses;
  const roomItems = usingSession && session ? session.roomItems : localRoomItems;
  const step = usingSession && session ? session.step : localStep;
  const actionsIndex = usingSession && session ? session.actionsIndex : localActionsIndex;
  const setFocuses = usingSession && session ? session.setFocuses : setLocalFocuses;
  const setRoomItems = usingSession && session ? session.setRoomItems : setLocalRoomItems;
  const setStep = usingSession && session ? session.setStep : setLocalStep;
  const setActionsIndex = usingSession && session ? session.setActionsIndex : setLocalActionsIndex;
  const previousFocusCount = useRef<number | null>(null);

  const setFocusesAndTrack = (update: SetStateAction<Focus[]>) => {
    setFocuses((current) => {
      const next = typeof update === 'function' ? update(current) : update;
      trackNewlyScheduledActions(current, next);
      return next;
    });
  };

  useEffect(() => {
    const previous = previousFocusCount.current;
    previousFocusCount.current = focuses.length;
    if (previous !== null && focuses.length > previous) {
      trackWeeklyPlanStarted();
    }
  }, [focuses.length]);

  // Planning time counts only while this tab is visible.
  useEffect(() => watchPlanVisibility(), []);

  // Only meaningful on the actions step, so moving between other steps
  // never re-fires because of a stale index.
  const viewedFocusIndex = step === 'actions' ? actionsIndex : undefined;
  useEffect(() => {
    trackPlanStepViewed(step, STEP_NUMBER[step], viewedFocusIndex);
  }, [step, viewedFocusIndex]);

  useEffect(() => {
    const next = assignFocusColors(focuses);
    if (next !== focuses) setFocuses(next);
  }, [focuses, setFocuses]);

  const goToActionsFor = (index: number) => {
    setActionsIndex(index);
    setStep('actions');
  };

  const handleActionsContinue = () => {
    if (actionsIndex < focuses.length - 1) {
      setActionsIndex(actionsIndex + 1);
    } else {
      setStep('prioritize');
    }
  };

  const handleActionsBack = () => {
    if (actionsIndex > 0) {
      setActionsIndex(actionsIndex - 1);
    } else {
      setStep('focuses');
    }
  };

  const updateFocusActions = (focusId: string, update: (actions: ActionItem[]) => ActionItem[]) => {
    setFocusesAndTrack((current) =>
      current.map((f) => (f.id === focusId ? { ...f, actions: update(f.actions) } : f))
    );
  };

  if (step === 'focuses') {
    return (
      <div className="tend-flow">
        <FocusesStep
          focuses={focuses}
          onChange={setFocusesAndTrack}
          onContinue={() => {
            trackWeeklyPlanStarted();
            goToActionsFor(0);
          }}
        />
      </div>
    );
  }

  if (step === 'actions') {
    const focus = focuses[actionsIndex];
    if (!focus) {
      // No focuses to brainstorm for (e.g. someone removed them all) — go back.
      setStep('focuses');
      return null;
    }
    return (
      <div className="tend-flow">
        <ActionsStep
          key={focus.id}
          focus={focus}
          focusIndex={actionsIndex}
          totalFocuses={focuses.length}
          onChangeActions={(update) => updateFocusActions(focus.id, update)}
          onBack={handleActionsBack}
          onContinue={handleActionsContinue}
        />
      </div>
    );
  }

  if (step === 'prioritize') {
    return (
      <div className="tend-flow">
        <PrioritizeStep
          focuses={focuses}
          roomItems={roomItems}
          onChange={setFocusesAndTrack}
          onRoomItemsChange={setRoomItems}
          onBack={() => goToActionsFor(Math.max(focuses.length - 1, 0))}
          onContinue={() => setStep('makeRoom')}
        />
      </div>
    );
  }

  if (step === 'makeRoom') {
    return (
      <div className="tend-flow">
        <MakeRoomStep
          focuses={focuses}
          items={roomItems}
          onChange={setRoomItems}
          onFocusesChange={setFocusesAndTrack}
          onBack={() => setStep('prioritize')}
          onContinue={() => {
            trackWeeklyPlanCompleted(focuses);
            setStep('yourWeek');
          }}
        />
      </div>
    );
  }

  return (
    <div className="tend-flow">
      <YourWeekStep
        focuses={focuses}
        roomItems={roomItems}
        onPlanChange={({ focuses: nextFocuses, roomItems: nextRoomItems }) => {
          setFocusesAndTrack(nextFocuses);
          setRoomItems(nextRoomItems);
        }}
        onBack={() => setStep('makeRoom')}
        onSend={(email) => onComplete?.({ focuses, roomItems, email })}
        onStartOver={() => {
          trackPlanStartedOver(step);
          setFocuses([]);
          setRoomItems([]);
          setActionsIndex(0);
          setStep('focuses');
        }}
      />
    </div>
  );
}

'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react';
import type { Focus, RoomItem } from '@tend/core';
import type { TendStep } from './flow-steps';

export interface PlanSessionValue {
  hydrated: boolean;
  focuses: Focus[];
  roomItems: RoomItem[];
  step: TendStep;
  actionsIndex: number;
  hydrate: (plan: { focuses: Focus[]; roomItems: RoomItem[] } | null, step?: TendStep) => void;
  setFocuses: Dispatch<SetStateAction<Focus[]>>;
  setRoomItems: Dispatch<SetStateAction<RoomItem[]>>;
  setStep: Dispatch<SetStateAction<TendStep>>;
  setActionsIndex: Dispatch<SetStateAction<number>>;
}

const PlanSessionContext = createContext<PlanSessionValue | null>(null);

/**
 * One in-memory week, shared by the planner and `/goals/[goalId]/edit`.
 * Absent in tests that render a step on its own.
 */
export function PlanSessionProvider({ children }: { children: ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [focuses, setFocuses] = useState<Focus[]>([]);
  const [roomItems, setRoomItems] = useState<RoomItem[]>([]);
  const [step, setStep] = useState<TendStep>('focuses');
  const [actionsIndex, setActionsIndex] = useState(0);

  const hydrate = useCallback(
    (plan: { focuses: Focus[]; roomItems: RoomItem[] } | null, nextStep?: TendStep) => {
      setFocuses(plan?.focuses ?? []);
      setRoomItems(plan?.roomItems ?? []);
      setStep(nextStep ?? (plan ? 'yourWeek' : 'focuses'));
      setActionsIndex(0);
      setHydrated(true);
    },
    [],
  );

  const value = useMemo(
    () => ({
      hydrated,
      focuses,
      roomItems,
      step,
      actionsIndex,
      hydrate,
      setFocuses,
      setRoomItems,
      setStep,
      setActionsIndex,
    }),
    [hydrated, focuses, roomItems, step, actionsIndex, hydrate],
  );

  return <PlanSessionContext.Provider value={value}>{children}</PlanSessionContext.Provider>;
}

export function usePlanSession(): PlanSessionValue | null {
  return useContext(PlanSessionContext);
}

export type TendStep = 'focuses' | 'actions' | 'prioritize' | 'makeRoom' | 'yourWeek';

export const STEP_NUMBER: Record<TendStep, number> = {
  focuses: 1,
  actions: 2,
  prioritize: 3,
  makeRoom: 4,
  yourWeek: 5,
};

export const TOTAL_STEPS = 5;
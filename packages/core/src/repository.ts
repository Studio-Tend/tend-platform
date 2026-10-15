import type { Goal, NewGoal } from './goal';
import type { CheckIn, NewCheckIn } from './check-in';

/**
 * Screens depend on this interface, never on AsyncStorage directly.
 *
 * That's the whole reason it exists: when the API lands, you write a
 * second implementation and change one line of wiring. Nothing in the
 * UI has to know storage moved.
 */
export interface TendRepository {
  listGoals(): Promise<Goal[]>;
  getGoal(id: string): Promise<Goal | null>;
  createGoal(input: NewGoal): Promise<Goal>;
  archiveGoal(id: string): Promise<void>;

  listCheckIns(goalId: string): Promise<CheckIn[]>;
  createCheckIn(input: NewCheckIn): Promise<CheckIn>;
}

/** Thrown when a create would exceed MAX_ACTIVE_GOALS. */
export class GoalLimitReachedError extends Error {
  constructor(limit: number) {
    super(`Only ${limit} active goals at a time.`);
    this.name = 'GoalLimitReachedError';
  }
}

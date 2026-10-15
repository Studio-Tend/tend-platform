import { z } from 'zod';

/**
 * Tend is about making room, not adding more. The cap is a product
 * decision, so it lives in the domain layer — not in a screen.
 */
export const MAX_ACTIVE_GOALS = 6;

/** Titles are short on purpose. A goal you can't say in a line isn't one goal. */
export const GOAL_TITLE_MAX = 60;
export const INTENTION_MAX = 140;

export const CadenceSchema = z.enum(['daily', 'weekly']);
export type Cadence = z.infer<typeof CadenceSchema>;

export const GoalSchema = z.object({
  id: z.string().min(1),
  title: z.string().trim().min(1).max(GOAL_TITLE_MAX),
  /** The "why". Optional, but surfaced at check-in time. */
  intention: z.string().trim().max(INTENTION_MAX).optional(),
  cadence: CadenceSchema,
  /** ISO 8601 strings. Readable in storage, sortable as text. */
  createdAt: z.string().min(1),
  archivedAt: z.string().min(1).nullable().default(null),
});

export type Goal = z.infer<typeof GoalSchema>;

export const NewGoalSchema = GoalSchema.pick({
  title: true,
  intention: true,
  cadence: true,
});

export type NewGoal = z.infer<typeof NewGoalSchema>;

export function isActive(goal: Goal): boolean {
  return goal.archivedAt === null;
}

export function activeGoals(goals: readonly Goal[]): Goal[] {
  return goals.filter(isActive);
}

export function canAddGoal(goals: readonly Goal[]): boolean {
  return activeGoals(goals).length < MAX_ACTIVE_GOALS;
}

export function remainingGoalSlots(goals: readonly Goal[]): number {
  return Math.max(0, MAX_ACTIVE_GOALS - activeGoals(goals).length);
}

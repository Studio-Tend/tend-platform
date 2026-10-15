import { z } from 'zod';

/**
 * The thesis, in one type.
 *
 * Deliberately words, not numbers: a 1–10 slider turns "how did it feel"
 * back into scoring, which is the thing Tend defines itself against.
 *
 * Also deliberately absent: a `completed: boolean`. Other apps ask
 * "did you do it?" — we ask how it went. Revisit this after a week of
 * real use; if skipped days feel unrepresentable, that's a finding.
 */
export const FeelingSchema = z.enum([
  'draining',
  'heavy',
  'steady',
  'easy',
  'energizing',
]);

export type Feeling = z.infer<typeof FeelingSchema>;

/** Ordered from hardest to lightest. Safe to render directly. */
export const FEELINGS = FeelingSchema.options;

export const NOTE_MAX = 140;

export const CheckInSchema = z.object({
  id: z.string().min(1),
  goalId: z.string().min(1),
  feeling: FeelingSchema,
  /** Short by design. The cap is the restraint. */
  note: z.string().trim().max(NOTE_MAX).optional(),
  createdAt: z.string().min(1),
});

export type CheckIn = z.infer<typeof CheckInSchema>;

export const NewCheckInSchema = CheckInSchema.pick({
  goalId: true,
  feeling: true,
  note: true,
});

export type NewCheckIn = z.infer<typeof NewCheckInSchema>;

/**
 * Reads a run of check-ins as a direction rather than a streak.
 * Streaks punish gaps; this just notices which way things are going.
 */
export function recentFeelings(
  checkIns: readonly CheckIn[],
  limit = 5,
): Feeling[] {
  return [...checkIns]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit)
    .map((c) => c.feeling);
}

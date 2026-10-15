import { z } from 'zod';
import { INTENTION_MAX } from '../goal';
import { LABEL_MAX, type ActionItem, type Day, type Daypart, type Focus, type RoomItem, type ScheduleSlot } from './types';

/*
 * Request contract for POST /api/send-week.
 *
 * Lives in core so the client form and the route validate against the same
 * shape. The tuples below repeat the Day/Daypart unions because z.enum needs
 * a literal tuple; the `Same<>` checks at the bottom fail the build if they
 * ever drift from types.ts.
 */

const DAY_VALUES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
const DAYPART_VALUES = ['Morning', 'Afternoon', 'Evening'] as const;

const idSchema = z.string().min(1).max(100);
const labelSchema = z.string().trim().min(1).max(LABEL_MAX);

export const ScheduleSlotSchema = z.object({
  day: z.enum(DAY_VALUES),
  dayparts: z.array(z.enum(DAYPART_VALUES)).max(3),
});

/*
 * Hand-sorted board positions, keyed by `laneKey` ("Mon:Morning", "Mon:anytime",
 * "unscheduled"). The key pattern and the entry cap are enforced here because
 * this arrives from a reopen link, which anyone holding the email can edit.
 */
const laneKeySchema = z
  .string()
  .regex(new RegExp(`^(unscheduled|(${DAY_VALUES.join('|')}):(${DAYPART_VALUES.join('|')}|anytime))$`));

const laneOrdersSchema = z
  .record(laneKeySchema, z.number().int().min(0).max(1000))
  .refine((orders) => Object.keys(orders).length <= 28, { message: 'Too many lane positions' })
  .optional();

export const ActionItemSchema = z.object({
  id: idSchema,
  label: labelSchema,
  checked: z.boolean(),
  slots: z.array(ScheduleSlotSchema).max(7),
  laneOrders: laneOrdersSchema,
});

export const FocusSchema = z.object({
  id: idSchema,
  title: labelSchema,
  actions: z.array(ActionItemSchema).max(50),
  colorIndex: z.number().int().min(0).max(5).optional(),
});

export const RoomItemSchema = z.object({
  id: idSchema,
  label: labelSchema,
  slots: z.array(ScheduleSlotSchema).max(7),
  intention: z.string().trim().min(1).max(INTENTION_MAX).optional(),
  laneOrders: laneOrdersSchema,
});

export const PlanStateSchema = z.object({
  focuses: z.array(FocusSchema).max(10),
  roomItems: z.array(RoomItemSchema).max(50),
});

export const PlanLinkSchema = z.object({
  v: z.literal(1),
  f: PlanStateSchema.shape.focuses,
  r: PlanStateSchema.shape.roomItems,
});

function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone });
    return true;
  } catch {
    return false;
  }
}

export const SendWeekRequestSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  plan: PlanStateSchema,
  timeZone: z
    .string()
    .trim()
    .min(1)
    .max(64)
    .refine(isValidTimeZone, { message: 'Invalid time zone' }),
  /** Honeypot: hidden from people, filled by bots. The route checks it; the schema only bounds it. */
  company: z.string().max(500).optional(),
  /** Plan session id for server-side analytics. Not shown in the email. */
  session_id: z.string().trim().max(128).optional(),
});

/** What the client sends. */
export type SendWeekRequest = z.input<typeof SendWeekRequestSchema>;
export type PlanState = z.output<typeof PlanStateSchema>;
export type PlanLink = z.output<typeof PlanLinkSchema>;

// ---- compile-time drift guards (no runtime cost) ----
type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
const _dayMatches: Same<(typeof DAY_VALUES)[number], Day> = true;
const _daypartMatches: Same<(typeof DAYPART_VALUES)[number], Daypart> = true;
const _slotMatches: Same<z.output<typeof ScheduleSlotSchema>, ScheduleSlot> = true;
const _actionMatches: Same<z.output<typeof ActionItemSchema>, ActionItem> = true;
const _focusMatches: Same<z.output<typeof FocusSchema>, Focus> = true;
const _roomMatches: Same<z.output<typeof RoomItemSchema>, RoomItem> = true;
void _dayMatches;
void _daypartMatches;
void _slotMatches;
void _actionMatches;
void _focusMatches;
void _roomMatches;

export const PLAN_EVENTS = {
  /** A planner step is shown. One event with a `step` property, so the funnel is one query. */
  stepViewed: 'plan_step_viewed',
  /** First focus is added (or the seeded walkthrough is continued). */
  started: 'weekly_plan_started',
  /** An action that had no day is given a time slot. */
  actionScheduled: 'action_scheduled',
  /** Reached the finished plan screen (Your week). Not that the calendar week is over. */
  completed: 'weekly_plan_completed',
  /** A saved week was opened from the link in the week email. */
  reopened: 'weekly_plan_reopened',
  /** A `#w=` link was present but could not be decoded. */
  linkInvalid: 'plan_link_invalid',
  /** "Start over" was confirmed. A new analytics session begins after it. */
  startedOver: 'plan_started_over',
  sendWeekClicked: 'send_week_clicked',
  weekEmailSubmitted: 'week_email_submitted',
  weekEmailSent: 'week_email_sent',
  weekEmailFailed: 'week_email_failed',
  waitlistClicked: 'waitlist_clicked',
  waitlistSubmitted: 'waitlist_submitted',
} as const;

'use client';

import {
  buildWeekEntries,
  SendWeekRequestSchema,
  type Focus,
  type RoomItem,
} from '@tend/core';
import { useId, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { getPlanSessionId, PLAN_EVENTS, planActionCounts } from '@/lib/plan-analytics';
import { track } from '@/lib/analytics';
import { SendWeekLimitError, TEND_WAITLIST_URL, sendWeek, validateWeekEmail } from './send-week';

interface SendWeekFormProps {
  focuses: Focus[];
  roomItems: RoomItem[];
  onSent?: (email: string) => void;
  /** Fired when Send my week is activated, before validation or the request. */
  onSendClick?: () => void;
  /** True while the email field is open, so the footer can hide Back. */
  onExpandedChange?: (expanded: boolean) => void;
}

type SendWeekView = 'idle' | 'form' | 'success';

/**
 * Step 5 footer action: "Email this to me" expands into an email field,
 * then a sending state, then a waitlist offer. Posts the week to Resend
 * without dropping the existing PostHog events.
 */
export function SendWeekForm({ focuses, roomItems, onSent, onSendClick, onExpandedChange }: SendWeekFormProps) {
  const emailId = useId();
  const errorId = useId();
  const privacyId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const inFlightRef = useRef(false);

  const [view, setView] = useState<SendWeekView>('idle');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { action_count } = planActionCounts(focuses);

  const openForm = () => {
    track(PLAN_EVENTS.sendWeekClicked, {
      session_id: getPlanSessionId(),
      action_count,
    });
    setError(null);
    setView('form');
    onExpandedChange?.(true);
  };

  const closeForm = () => {
    if (submitting) return;
    setError(null);
    setView('idle');
    onExpandedChange?.(false);
    requestAnimationFrame(() => triggerRef.current?.focus());
  };

  const handleFormKeyDown = (event: KeyboardEvent<HTMLFormElement>) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      closeForm();
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (inFlightRef.current || submitting) return;
    onSendClick?.();

    const trimmed = email.trim();
    const validationError = validateWeekEmail(trimmed);
    if (validationError) {
      setError(validationError);
      inputRef.current?.focus();
      return;
    }

    if (buildWeekEntries(focuses, roomItems).length === 0) {
      setError('Add something to your week first.');
      inputRef.current?.focus();
      return;
    }

    const session_id = getPlanSessionId();
    const marketing_opt_in = false;
    const payload = {
      email: trimmed,
      plan: { focuses, roomItems },
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      company,
      session_id,
    };
    const check = SendWeekRequestSchema.safeParse(payload);
    if (!check.success) {
      const emailIssue = check.error.issues.some((issue) => issue.path[0] === 'email');
      setError(emailIssue ? 'Check the email address and try again.' : 'The plan could not be sent. Try again.');
      inputRef.current?.focus();
      return;
    }

    inFlightRef.current = true;
    setSubmitting(true);
    setError(null);
    setEmail(trimmed);

    try {
      await sendWeek(check.data);
      track(PLAN_EVENTS.weekEmailSubmitted, { session_id, marketing_opt_in });
      setView('success');
      onExpandedChange?.(false);
      onSent?.(trimmed);
    } catch (err) {
      track(PLAN_EVENTS.weekEmailFailed, { session_id });
      setError(
        err instanceof SendWeekLimitError
          ? "You've sent your week a few times already. Try again a little later."
          : "We couldn't send your week. Try again.",
      );
    } finally {
      inFlightRef.current = false;
      setSubmitting(false);
    }
  };

  return (
    <div className="tend-send-week">
      {view === 'idle' && (
        <button ref={triggerRef} type="button" className="tend-button-ghost" onClick={openForm}>
          Email this to me
        </button>
      )}

      {view === 'form' && (
        <form
          className="tend-send-week__form"
          noValidate
          onSubmit={handleSubmit}
          onKeyDown={handleFormKeyDown}
          aria-busy={submitting}
        >
          <label htmlFor={emailId} className="tend-send-week__prompt">
            Where should we send your week?
          </label>
          <div className="tend-send-week__row">
            <div className="tend-send-week__field">
              <input
                ref={inputRef}
                id={emailId}
                name="email"
                type="email"
                required
                autoFocus
                autoComplete="email"
                inputMode="email"
                placeholder="you@email.com"
                value={email}
                disabled={submitting}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? `${errorId} ${privacyId}` : privacyId}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError(null);
                }}
                className="tend-input"
              />
              {error && (
                <p id={errorId} className="tend-send-week__error" role="alert">
                  {error}
                </p>
              )}
            </div>
            <div className="tend-send-week__actions">
              <button
                type="button"
                className="tend-button-ghost tend-send-week__cancel"
                onClick={closeForm}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="tend-button-primary tend-send-week__submit"
                disabled={submitting}
                onClick={() => onSendClick?.()}
              >
                {submitting && <span className="tend-send-week__spinner" aria-hidden="true" />}
                {submitting ? 'Sending...' : 'Send my week'}
              </button>
            </div>
          </div>
          <p id={privacyId} className="tend-hint tend-send-week__hint">
            We&apos;ll only use this to send your week.
          </p>

          <div aria-hidden="true" className="tend-sr-only">
            <label>
              Company
              <input
                type="text"
                name="company"
                tabIndex={-1}
                autoComplete="off"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
              />
            </label>
          </div>
        </form>
      )}

      {view === 'success' && (
        <div className="tend-send-week__success" role="status" aria-live="polite">
          <a
            className="tend-send-week__waitlist"
            href={TEND_WAITLIST_URL}
            onClick={() => track(PLAN_EVENTS.waitlistClicked, { session_id: getPlanSessionId() })}
          >
            Join the Tend waitlist →
          </a>
        </div>
      )}
    </div>
  );
}

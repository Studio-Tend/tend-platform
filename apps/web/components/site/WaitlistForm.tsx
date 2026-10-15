'use client';

import { useRef, useState } from 'react';
import { track } from '@/lib/analytics';
import { PLAN_EVENTS, waitlistEventProperties } from '@/lib/plan-analytics';

/** Signups land in the connected Formspree inbox. */
export const FORMSPREE_ENDPOINT = 'https://formspree.io/f/mbgrqqwr';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type NoteStatus = 'idle' | 'error' | 'success';

export function WaitlistNavLink() {
  return (
    <a
      className="tend-site__nav-link"
      href="#waitlist"
      onClick={() => track(PLAN_EVENTS.waitlistClicked, waitlistEventProperties())}
    >
      Join waitlist
    </a>
  );
}

export function WaitlistForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [email, setEmail] = useState('');
  const [note, setNote] = useState('');
  const [status, setStatus] = useState<NoteStatus>('idle');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const form = event.currentTarget;

    if (!EMAIL_PATTERN.test(email.trim())) {
      setNote("That doesn't look like a valid email — give it another try.");
      setStatus('error');
      return;
    }

    setSubmitting(true);
    setNote('');
    setStatus('idle');

    try {
      const response = await fetch(FORMSPREE_ENDPOINT, {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: new FormData(form),
      });

      if (response.ok) {
        setNote("You're on the list. Talk soon.");
        setStatus('success');
        setEmail('');
        formRef.current?.reset();
        track(PLAN_EVENTS.waitlistSubmitted, waitlistEventProperties());
      } else {
        setNote('Something went wrong — mind trying again?');
        setStatus('error');
      }
    } catch {
      setNote('Something went wrong — mind trying again?');
      setStatus('error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <form ref={formRef} className="tend-site__form" onSubmit={handleSubmit} noValidate>
        <label htmlFor="email-input" className="tend-site__sr-only">
          Email address
        </label>

        <input
          type="email"
          name="email"
          id="email-input"
          placeholder="you@email.com"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />

        <input type="hidden" name="_subject" value="New Tend waitlist signup" />

        <button type="submit" disabled={submitting}>
          {submitting ? 'Joining…' : 'Join the waitlist'}
        </button>
      </form>

      <div
        className={
          status === 'idle'
            ? 'tend-site__form-note'
            : `tend-site__form-note tend-site__form-note--${status}`
        }
        role="status"
        aria-live="polite"
      >
        {note}
      </div>
    </>
  );
}

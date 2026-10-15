import { INTENTION_MAX } from '@tend/core';
import { useEffect, useId, useRef, useState } from 'react';
import { useDialogModal } from '@/lib/use-dialog-modal';

const PRESETS = ['Rest & recovery', 'Connection', 'Joy & play', 'Growth', 'Health & energy'] as const;

/** Long enough to see the check, short enough that the dialog doesn't linger. */
const CONFIRM_MS = 200;

function confirmDelay(): number {
  if (typeof window.matchMedia !== 'function') return CONFIRM_MS;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : CONFIRM_MS;
}

type Choice = (typeof PRESETS)[number] | 'Other';

function draftFrom(intention: string | undefined): { choice: Choice | null; otherText: string } {
  if (!intention) return { choice: null, otherText: '' };
  if ((PRESETS as readonly string[]).includes(intention)) return { choice: intention as Choice, otherText: '' };
  return { choice: 'Other', otherText: intention };
}

/**
 * Optional phrase for a make-room item: what it would bring into the week.
 * One choice, or a short note under Other. An empty Other does not count.
 */
export function IntentionControl({
  label,
  intention,
  onChange,
}: {
  label: string;
  intention?: string | undefined;
  onChange: (intention: string | undefined) => void;
}) {
  const [open, setOpen] = useState(false);
  const [choice, setChoice] = useState<Choice | null>(null);
  const [otherText, setOtherText] = useState('');
  const dialogRef = useRef<HTMLDialogElement>(null);
  const optionRef = useRef<HTMLButtonElement>(null);
  const otherRef = useRef<HTMLInputElement>(null);
  const closeTimer = useRef<number | null>(null);
  const titleId = useId();
  const activityId = useId();

  useDialogModal(open, dialogRef, choice === 'Other' ? otherRef : optionRef);

  const clearCloseTimer = () => {
    if (closeTimer.current === null) return;
    window.clearTimeout(closeTimer.current);
    closeTimer.current = null;
  };

  useEffect(() => clearCloseTimer, []);

  const openDialog = () => {
    clearCloseTimer();
    const draft = draftFrom(intention);
    setChoice(draft.choice);
    setOtherText(draft.otherText);
    setOpen(true);
  };

  const dismiss = () => {
    clearCloseTimer();
    setOpen(false);
  };

  const commit = (next: Choice | null = choice, text = otherText) => {
    clearCloseTimer();
    if (next === 'Other') {
      const trimmed = text.trim();
      onChange(trimmed ? trimmed : undefined);
    } else {
      onChange(next ?? undefined);
    }
    setOpen(false);
  };

  const confirmSoon = (next: Choice | null) => {
    clearCloseTimer();
    closeTimer.current = window.setTimeout(() => {
      closeTimer.current = null;
      commit(next);
    }, confirmDelay());
  };

  const pick = (next: Choice) => {
    const resolved = choice === next ? null : next;
    setChoice(resolved);
    if (resolved === 'Other') {
      clearCloseTimer();
      return;
    }
    confirmSoon(resolved);
  };

  return (
    <>
      <button
        type="button"
        className={intention ? 'tend-scheduled-pill tend-intention-pill' : 'tend-button-ghost tend-time-add'}
        onClick={openDialog}
      >
        {intention ? `${intention} ✎` : '+ Add intention'}
      </button>
      <dialog
        ref={dialogRef}
        className="tend-dialog tend-intention"
        aria-labelledby={titleId}
        onClose={dismiss}
        onClick={(event) => {
          if (event.target === event.currentTarget) dismiss();
        }}
        onKeyDown={(event) => {
          if (event.key !== 'Escape') return;
          event.preventDefault();
          event.stopPropagation();
          dismiss();
        }}
      >
        <div className="tend-intention__card">
          <div className="tend-intention__activity">
            <span className="tend-intention__eyebrow" id={activityId}>
              Activity
            </span>
            <p className="tend-intention__name" aria-labelledby={activityId}>
              {label}
            </p>
          </div>
          <h2 id={titleId} className="tend-intention__question">
            What would this bring into your life?
          </h2>
          <div className="tend-intention__options" role="group" aria-labelledby={titleId}>
            {PRESETS.map((option) => {
              const selected = choice === option;
              const focused = selected || (choice === null && option === PRESETS[0]);
              return (
                <button
                  key={option}
                  ref={focused ? optionRef : undefined}
                  type="button"
                  className="tend-intention__option"
                  aria-pressed={selected}
                  onClick={() => pick(option)}
                >
                  <span>{option}</span>
                  {selected ? (
                    <span className="tend-intention__check" aria-hidden="true">
                      ✓
                    </span>
                  ) : null}
                </button>
              );
            })}
            <button
              type="button"
              className="tend-intention__option"
              aria-pressed={choice === 'Other'}
              onClick={() => pick('Other')}
            >
              <span>Other</span>
              {choice === 'Other' ? (
                <span className="tend-intention__check" aria-hidden="true">
                  ✓
                </span>
              ) : null}
            </button>
          </div>
          {choice === 'Other' ? (
            <input
              ref={otherRef}
              type="text"
              className="tend-input tend-intention__other"
              aria-label="Your intention"
              placeholder="In your own words"
              maxLength={INTENTION_MAX}
              value={otherText}
              onChange={(event) => setOtherText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  commit('Other', event.currentTarget.value);
                }
              }}
            />
          ) : null}
          <p className="tend-intention__note">Optional · Choose one</p>
          {choice === 'Other' ? (
            <button type="button" className="tend-button-ghost tend-intention__done" onClick={() => commit('Other')}>
              Done
            </button>
          ) : null}
        </div>
      </dialog>
    </>
  );
}

import { useState, type Dispatch, type SetStateAction } from 'react';
import { ProgressHeader } from './ProgressHeader';
import { EditableField } from '@/components/ui/EditableField';
import { ReorderHandle, ReorderStatus, useReorderDrag } from './ReorderHandle';
import { moveById, reorderById } from './reorder';
import { MAX_FOCUSES, type Focus } from '@tend/core';
import { makeId } from '@/lib/make-id';

export const EXTRA_FOCUS_MESSAGES = [
  'Okay, overachiever 👀',
  "Three wasn't quite enough, huh?",
  'Making room for one more?',
  'A little extra ambition this week?',
  'We said focus. You said… more focus.',
  'Alright, one more.',
  'Apparently we have four priorities now.',
  'Bold of us to call these priorities.',
] as const;

export const FOCUS_CAP_MESSAGE = "That's a lot to hold as a focus. Could one of these wait until next week?";

interface FocusesStepProps {
  focuses: Focus[];
  onChange: Dispatch<SetStateAction<Focus[]>>;
  onContinue: () => void;
}

function pickExtraFocusMessage(): string {
  const index = Math.floor(Math.random() * EXTRA_FOCUS_MESSAGES.length);
  return EXTRA_FOCUS_MESSAGES[index] ?? EXTRA_FOCUS_MESSAGES[0];
}

const FOCUS_SCOPE = 'focuses';

/** Step 1 — "What are you tending to this week?" Start with three, allow up to six. */
export function FocusesStep({ focuses, onChange, onContinue }: FocusesStepProps) {
  const [draft, setDraft] = useState('');
  const [note, setNote] = useState<string | null>(null);
  const atLimit = focuses.length >= MAX_FOCUSES;
  const reorder = useReorderDrag((scope, fromId, toId) => {
    if (scope !== FOCUS_SCOPE) return;
    onChange((current) => reorderById(current, fromId, toId));
  });

  const addFocus = () => {
    const text = draft.trim();
    if (!text) return;
    if (focuses.length >= MAX_FOCUSES) {
      setNote(FOCUS_CAP_MESSAGE);
      return;
    }

    const nextCount = focuses.length + 1;
    onChange((current) => {
      if (current.length >= MAX_FOCUSES) return current;
      return [...current, { id: makeId(), title: text, actions: [] }];
    });
    setDraft('');
    setNote(nextCount === 4 ? pickExtraFocusMessage() : null);
  };

  const removeFocus = (id: string) => {
    onChange((current) => current.filter((f) => f.id !== id));
    setNote(null);
  };

  const updateFocusTitle = (id: string, title: string) => {
    onChange((current) => current.map((f) => (f.id === id ? { ...f, title } : f)));
  };

  return (
    <div className="tend-flow__screen">
      <div className="tend-flow__column">
        <div className="tend-flow__body">
          <ProgressHeader step="focuses" />

          <div className="tend-flow__titles">
            <h1 className="tend-flow__title">What are you tending to this week?</h1>
            <p className="tend-flow__subtitle">Start with three areas that deserve your attention this week.</p>
          </div>

          <div className="tend-flow__composer">
            <div className="tend-flow__add-row">
              <input
                type="text"
                aria-label="Add a focus"
                placeholder="Add a focus…"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') addFocus();
                }}
                className="tend-input"
              />
              <button type="button" disabled={atLimit} onClick={addFocus} className="tend-button-primary">
                Add
              </button>
            </div>
            <p className="tend-hint tend-flow__focus-note" role="status" aria-live="polite">
              {atLimit ? FOCUS_CAP_MESSAGE : note}
            </p>
            <ReorderStatus message={reorder.announcement} />
            <div className="tend-flow__list">
              {focuses.map((focus, index) => (
                <div
                  key={focus.id}
                  className={reorder.rowClass('tend-card', FOCUS_SCOPE, focus.id)}
                  {...reorder.rowProps(FOCUS_SCOPE, focus.id)}
                >
                  {focuses.length > 1 && (
                    <ReorderHandle
                      label={focus.title}
                      index={index}
                      count={focuses.length}
                      dragging={reorder.isDragging(FOCUS_SCOPE, focus.id)}
                      onKeyMove={(delta) => onChange((current) => moveById(current, focus.id, delta))}
                      announce={reorder.announce}
                      {...reorder.handleProps(FOCUS_SCOPE, focus.id)}
                    />
                  )}
                  <EditableField
                    variant="title"
                    value={focus.title}
                    ariaLabel={`Edit ${focus.title}`}
                    onCommit={(title) => updateFocusTitle(focus.id, title)}
                  />
                  <button
                    type="button"
                    aria-label={`Remove ${focus.title}`}
                    onClick={() => removeFocus(focus.id)}
                    className="tend-icon-button"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="tend-flow__footer">
        <div className="tend-flow__footer-inner">
          <button type="button" className="tend-button-primary" disabled={focuses.length === 0} onClick={onContinue}>
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}

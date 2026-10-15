'use client';

import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type MutableRefObject,
  type Ref,
} from 'react';
import type { Focus } from '@tend/core';
import { makeId } from '@/lib/make-id';
import { useDialogModal } from '@/lib/use-dialog-modal';
import { useKeyboardInset } from '@/lib/use-keyboard-inset';
import { useMediaQuery } from '@/lib/use-media-query';
import './tend-flow.css';
import {
  MAX_GOAL_ACTIONS,
  actionIsOnWeek,
  actionNameError,
  applyGoalDraft,
  draftFromFocus,
  goalDraftError,
  goalNameError,
  isGoalDraftDirty,
  type GoalDraft,
} from './edit-goal';

const COMPACT_VIEWPORT = '(max-width: 760px)';

export function EditGoal({
  goal,
  closeLabel,
  titleId: titleIdProp,
  headingRef,
  attemptCloseRef,
  onSave,
  onClose,
}: {
  goal: Focus;
  closeLabel: 'Back' | 'Close';
  titleId?: string;
  headingRef?: Ref<HTMLHeadingElement>;
  attemptCloseRef?: MutableRefObject<(() => void) | null>;
  onSave: (next: Focus) => void | Promise<void>;
  onClose: () => void;
}) {
  const generatedTitleId = useId();
  const titleId = titleIdProp ?? generatedTitleId;
  const nameId = useId();
  const nameErrorId = useId();
  const addId = useId();
  const addInputRef = useRef<HTMLInputElement>(null);
  const composerEscapeRef = useRef(false);
  const savingRef = useRef(false);
  const mountedRef = useRef(true);
  const keyboardInset = useKeyboardInset();
  const [draft, setDraft] = useState<GoalDraft>(() => draftFromFocus(goal));
  const [adding, setAdding] = useState(false);
  const [pendingAdd, setPendingAdd] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [removeId, setRemoveId] = useState<string | null>(null);

  const dirty = isGoalDraftDirty(goal, draft, pendingAdd);
  const titleError = goalNameError(draft.title);
  const pendingError = pendingAdd.trim() ? actionNameError(pendingAdd) : null;
  const formError = goalDraftError(draft, pendingAdd);
  const canSave = dirty && !formError && !saving;
  const atActionLimit = draft.actions.length >= MAX_GOAL_ACTIONS;

  const requestClose = () => {
    if (composerEscapeRef.current) {
      composerEscapeRef.current = false;
      return;
    }
    if (dirty) {
      setDiscardOpen(true);
      return;
    }
    onClose();
  };

  const requestCloseRef = useRef(requestClose);
  useEffect(() => {
    requestCloseRef.current = requestClose;
  });
  useEffect(() => {
    if (!attemptCloseRef) return;
    attemptCloseRef.current = () => requestCloseRef.current();
    return () => {
      attemptCloseRef.current = null;
    };
  }, [attemptCloseRef]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  useEffect(() => {
    if (!adding) return;
    addInputRef.current?.focus();
  }, [adding]);

  const cancelAdd = () => {
    composerEscapeRef.current = true;
    setPendingAdd('');
    setAdding(false);
    window.setTimeout(() => {
      composerEscapeRef.current = false;
    }, 0);
  };

  const addAction = () => {
    const label = pendingAdd.trim();
    if (!label || actionNameError(label) || atActionLimit) return;
    const nextCount = draft.actions.length + 1;
    setDraft((current) => ({
      ...current,
      actions: [...current.actions, { id: makeId(), label }],
    }));
    setPendingAdd('');
    setSaveError(null);
    if (nextCount >= MAX_GOAL_ACTIONS) {
      setAdding(false);
      return;
    }
    addInputRef.current?.focus();
  };

  const askRemove = (id: string) => {
    const existing = goal.actions.find((action) => action.id === id);
    if (actionIsOnWeek(existing)) {
      setRemoveId(id);
      return;
    }
    setDraft((current) => ({ ...current, actions: current.actions.filter((action) => action.id !== id) }));
  };

  const save = async () => {
    if (savingRef.current || !canSave) return;
    const pending = pendingAdd.trim();
    const nextDraft: GoalDraft = pending
      ? { ...draft, actions: [...draft.actions, { id: makeId(), label: pending }] }
      : draft;
    const error = goalDraftError(nextDraft);
    if (error) return;
    savingRef.current = true;
    setSaving(true);
    setSaveError(null);
    try {
      await onSave(applyGoalDraft(goal, nextDraft));
    } catch {
      savingRef.current = false;
      if (!mountedRef.current) return;
      setSaveError("Those changes didn't save. You can try again.");
      setSaving(false);
    }
  };

  const removing = draft.actions.find((action) => action.id === removeId);

  return (
    <div
      className="tend-goal-editor__frame"
      style={keyboardInset > 0 ? ({ '--keyboard-inset': `${keyboardInset}px` } as CSSProperties) : undefined}
    >
      <header className="tend-goal-editor__header">
        <h1 id={titleId} ref={headingRef} className="tend-goal-editor__title" tabIndex={-1}>
          Edit goal
        </h1>
        <button
          type="button"
          className={closeLabel === 'Close' ? 'tend-icon-button' : 'tend-flow__back-link'}
          aria-label={closeLabel === 'Close' ? 'Close' : 'Back'}
          onClick={requestClose}
        >
          {closeLabel === 'Close' ? '×' : '‹ Back'}
        </button>
      </header>

      <div className="tend-goal-editor__body">
        <div className="tend-goal-editor__field">
          <label className="tend-goal-editor__label" htmlFor={nameId}>
            Goal name
          </label>
          <input
            id={nameId}
            className="tend-input"
            value={draft.title}
            aria-invalid={titleError ? true : undefined}
            aria-describedby={titleError ? nameErrorId : undefined}
            onChange={(event) => {
              setDraft((current) => ({ ...current, title: event.target.value }));
              setSaveError(null);
            }}
          />
          {titleError ? (
            <p id={nameErrorId} className="tend-goal-editor__error" role="alert">
              {titleError}
            </p>
          ) : null}
        </div>

        <section className="tend-goal-editor__actions" aria-labelledby={`${titleId}-actions`}>
          <h2 id={`${titleId}-actions`} className="tend-goal-editor__section">
            Actions
          </h2>
          {draft.actions.length === 0 ? <p className="tend-hint">No actions yet.</p> : null}
          {draft.actions.length > 0 ? (
            <div className="tend-goal-editor__list">
              {draft.actions.map((action) => {
                const error = actionNameError(action.label);
                const errorId = `${nameId}-action-${action.id}`;
                return (
                  <div key={action.id} className="tend-goal-editor__action">
                    <label className="tend-goal-editor__action-label">
                      <span className="tend-sr-only">Action name</span>
                      <ActionNameField
                        value={action.label}
                        invalid={Boolean(error)}
                        describedBy={error ? errorId : undefined}
                        onValueChange={(label) => {
                          setDraft((current) => ({
                            ...current,
                            actions: current.actions.map((item) =>
                              item.id === action.id ? { ...item, label } : item,
                            ),
                          }));
                          setSaveError(null);
                        }}
                      />
                    </label>
                    <button
                      type="button"
                      className="tend-icon-button tend-goal-editor__remove"
                      aria-label={`Remove ${action.label || 'action'}`}
                      onClick={() => askRemove(action.id)}
                    >
                      ×
                    </button>
                    {error ? (
                      <p id={errorId} className="tend-goal-editor__error" role="alert">
                        {error}
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : null}

          {adding ? (
            <div className="tend-goal-editor__add">
              <input
                ref={addInputRef}
                id={addId}
                className="tend-input"
                placeholder="Action name"
                aria-label="New action"
                value={pendingAdd}
                onChange={(event) => setPendingAdd(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    addAction();
                  }
                  if (event.key === 'Escape') {
                    event.preventDefault();
                    event.stopPropagation();
                    cancelAdd();
                  }
                }}
              />
              {pendingError ? (
                <p className="tend-goal-editor__error" role="alert">
                  {pendingError}
                </p>
              ) : null}
            </div>
          ) : (
            <button type="button" className="tend-button-ghost" disabled={atActionLimit} onClick={() => setAdding(true)}>
              + Add action
            </button>
          )}
          {atActionLimit ? <p className="tend-hint">That's a lot of actions for one goal.</p> : null}
        </section>

        {saveError ? (
          <p className="tend-goal-editor__error" role="alert">
            {saveError}
          </p>
        ) : null}
      </div>

      <footer className="tend-goal-editor__footer">
        <button type="button" className="tend-button-ghost tend-goal-editor__cancel" onClick={requestClose}>
          Cancel
        </button>
        <button
          type="button"
          className="tend-button-primary"
          disabled={!canSave}
          aria-busy={saving || undefined}
          onClick={save}
        >
          {saving ? 'Saving...' : 'Save changes'}
        </button>
      </footer>

      <ConfirmDialog
        open={discardOpen}
        title="Discard these changes?"
        body="Your edits to this goal will be lost."
        confirmLabel="Discard"
        dismissLabel="Keep editing"
        onConfirm={onClose}
        onDismiss={() => setDiscardOpen(false)}
      />
      <ConfirmDialog
        open={Boolean(removing)}
        title="Remove this action?"
        body="This action is on your week. Removing it also takes it off this week's plan."
        confirmLabel="Remove"
        dismissLabel="Keep"
        onConfirm={() => {
          if (!removeId) return;
          setDraft((current) => ({
            ...current,
            actions: current.actions.filter((action) => action.id !== removeId),
          }));
          setRemoveId(null);
        }}
        onDismiss={() => setRemoveId(null)}
      />
    </div>
  );
}

function ActionNameField({
  value,
  invalid,
  describedBy,
  onValueChange,
}: {
  value: string;
  invalid: boolean;
  describedBy?: string;
  onValueChange: (value: string) => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (typeof CSS !== 'undefined' && CSS.supports('field-sizing', 'content')) {
      element.style.height = '';
      return;
    }

    const fit = () => {
      element.style.height = 'auto';
      const border = element.offsetHeight - element.clientHeight;
      element.style.height = `${element.scrollHeight + border}px`;
    };

    fit();
    const parent = element.parentElement;
    if (!parent || typeof ResizeObserver === 'undefined') return;
    let width = parent.clientWidth;
    const observer = new ResizeObserver(() => {
      if (parent.clientWidth === width) return;
      width = parent.clientWidth;
      fit();
    });
    observer.observe(parent);
    return () => observer.disconnect();
  }, [value]);

  return (
    <textarea
      ref={ref}
      rows={1}
      className="tend-input"
      value={value}
      aria-invalid={invalid ? true : undefined}
      aria-describedby={describedBy}
      onChange={(event) => onValueChange(event.target.value.replace(/\r?\n/g, ' '))}
      onKeyDown={(event) => {
        if (event.key === 'Enter') event.preventDefault();
      }}
    />
  );
}

function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  dismissLabel,
  onConfirm,
  onDismiss,
}: {
  open: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  dismissLabel: string;
  onConfirm: () => void;
  onDismiss: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const dismissRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const descId = useId();
  useDialogModal(open, dialogRef, dismissRef);

  return (
    <dialog
      ref={dialogRef}
      className="tend-dialog"
      aria-labelledby={titleId}
      aria-describedby={descId}
      onCancel={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onDismiss();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onDismiss();
      }}
    >
      <div className="tend-dialog__card">
        <h2 id={titleId} className="tend-dialog__title">
          {title}
        </h2>
        <p id={descId} className="tend-dialog__body">
          {body}
        </p>
        <div className="tend-dialog__actions">
          <button type="button" className="tend-button-primary" onClick={onConfirm}>
            {confirmLabel}
          </button>
          <button ref={dismissRef} type="button" className="tend-button-secondary" onClick={onDismiss}>
            {dismissLabel}
          </button>
        </div>
        <button type="button" className="tend-icon-button tend-dialog__close" aria-label="Close" onClick={onDismiss}>
          ×
        </button>
      </div>
    </dialog>
  );
}

export function EditGoalDrawer({
  goal,
  onSave,
  onClose,
}: {
  goal: Focus;
  onSave: (next: Focus) => void | Promise<void>;
  onClose: () => void;
}) {
  const compact = useMediaQuery(COMPACT_VIEWPORT);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const attemptCloseRef = useRef<(() => void) | null>(null);
  const titleId = useId();
  useDialogModal(true, dialogRef, headingRef);

  return (
    <dialog
      ref={dialogRef}
      className={compact ? 'tend-goal-editor tend-goal-editor--full' : 'tend-goal-editor'}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        attemptCloseRef.current?.();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) attemptCloseRef.current?.();
      }}
    >
      <EditGoal
        goal={goal}
        closeLabel={compact ? 'Back' : 'Close'}
        titleId={titleId}
        headingRef={headingRef}
        attemptCloseRef={attemptCloseRef}
        onSave={onSave}
        onClose={onClose}
      />
    </dialog>
  );
}

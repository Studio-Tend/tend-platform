import { useState } from 'react';
import { ProgressHeader } from './ProgressHeader';
import { EditableField } from '@/components/ui/EditableField';
import { ReorderHandle, ReorderStatus, useReorderDrag } from './ReorderHandle';
import { moveById, reorderById } from './reorder';
import type { ActionItem, Focus } from '@tend/core';
import { makeId } from '@/lib/make-id';

interface ActionsStepProps {
  focus: Focus;
  focusIndex: number;
  totalFocuses: number;
  onChangeActions: (update: (actions: ActionItem[]) => ActionItem[]) => void;
  onBack: () => void;
  onContinue: () => void;
}

/**
 * Step 2 — "What would make the biggest difference?" Runs once per focus (the parent
 * flow advances `focusIndex` and re-renders this with the next focus each
 * time Continue is pressed, until every focus has been brain-dumped).
 */
const ACTION_SCOPE = 'actions';

export function ActionsStep({ focus, focusIndex, totalFocuses, onChangeActions, onBack, onContinue }: ActionsStepProps) {
  const [draft, setDraft] = useState('');
  const reorder = useReorderDrag((scope, fromId, toId) => {
    if (scope !== ACTION_SCOPE) return;
    onChangeActions((actions) => reorderById(actions, fromId, toId));
  });

  const addAction = () => {
    const text = draft.trim();
    if (!text) return;
    onChangeActions((actions) => [...actions, { id: makeId(), label: text, checked: false, slots: [] }]);
    setDraft('');
  };

  const removeAction = (id: string) => {
    onChangeActions((actions) => actions.filter((a) => a.id !== id));
  };

  const updateActionLabel = (id: string, label: string) => {
    onChangeActions((actions) => actions.map((a) => (a.id === id ? { ...a, label } : a)));
  };

  return (
    <div className="tend-flow__screen">
      <div className="tend-flow__column">
        <div className="tend-flow__body">
          <ProgressHeader step="actions" />

          <div className="tend-flow__titles">
            <span className="tend-pill">
              Focus {focusIndex + 1} of {totalFocuses} · {focus.title}
            </span>
            <h1 className="tend-flow__title">What would make the biggest difference?</h1>
            <p className="tend-flow__subtitle">
              Brainstorm a few ways you could make progress. Think about the actions that could move this forward most. Add whatever comes to mind — you’ll narrow it down next.
            </p>
          </div>

          <div className="tend-flow__add-row">
            <input
              type="text"
              aria-label="Add an action"
              placeholder="Add a high-impact action…"
              value={draft}
              autoFocus
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') addAction();
              }}
              className="tend-input"
            />
            <button type="button" onClick={addAction} className="tend-button-primary">
              Add
            </button>
          </div>

          <ReorderStatus message={reorder.announcement} />
          <div className="tend-flow__list">
            {focus.actions.map((action, index) => (
              <div
                key={action.id}
                className={reorder.rowClass('tend-action-row', ACTION_SCOPE, action.id)}
                {...reorder.rowProps(ACTION_SCOPE, action.id)}
              >
                <div className="tend-action-row__main">
                  {focus.actions.length > 1 && (
                    <ReorderHandle
                      label={action.label}
                      index={index}
                      count={focus.actions.length}
                      dragging={reorder.isDragging(ACTION_SCOPE, action.id)}
                      onKeyMove={(delta) => onChangeActions((actions) => moveById(actions, action.id, delta))}
                      announce={reorder.announce}
                      {...reorder.handleProps(ACTION_SCOPE, action.id)}
                    />
                  )}
                  <EditableField
                    value={action.label}
                    ariaLabel={`Edit ${action.label}`}
                    onCommit={(label) => updateActionLabel(action.id, label)}
                    onDelete={() => removeAction(action.id)}
                  />
                  <button
                    type="button"
                    aria-label={`Remove ${action.label}`}
                    onClick={() => removeAction(action.id)}
                    className="tend-icon-button"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="tend-flow__footer tend-flow__footer--split">
        <div className="tend-flow__footer-inner">
          <button type="button" className="tend-flow__back-link" onClick={onBack}>
            ‹ Back
          </button>
          <button type="button" className="tend-button-primary" onClick={onContinue}>
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}

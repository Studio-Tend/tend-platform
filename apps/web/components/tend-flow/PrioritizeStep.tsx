import { useState, type Dispatch, type SetStateAction } from 'react';
import { ProgressHeader } from './ProgressHeader';
import { ScheduleControl } from './ScheduleControl';
import { useActivePlanDay, WeekAtAGlance, WeekGlancePlace } from './WeekAtAGlance';
import { EditableField } from '@/components/ui/EditableField';
import { ReorderHandle, ReorderStatus, useReorderDrag } from './ReorderHandle';
import { moveById, reorderById } from './reorder';
import type { ActionItem, Focus, RoomItem, ScheduleSlot } from '@tend/core';
import { makeId } from '@/lib/make-id';
import { busyDaysFrom, occupiedSlots, unschedulePlacement, type OccupiedSlot } from './busy-days';

interface PrioritizeStepProps {
  focuses: Focus[];
  roomItems: RoomItem[];
  onChange: Dispatch<SetStateAction<Focus[]>>;
  onRoomItemsChange: Dispatch<SetStateAction<RoomItem[]>>;
  onBack: () => void;
  onContinue: () => void;
}

/**
 * Step 3 — "What matters most this week?" All focuses and their brain-dumped
 * actions together, so choosing what matters happens across everything at
 * once rather than separately per goal. Focus titles and action text are
 * click-to-edit; checking an action also opens the time picker so a day can
 * be chosen without a second click. A selected action can be given several
 * days, each with its own times, without leaving this screen.
 */
const FOCUS_SCOPE = 'focuses';
const actionScope = (focusId: string) => `actions:${focusId}`;

export function PrioritizeStep({
  focuses,
  roomItems,
  onChange,
  onRoomItemsChange,
  onBack,
  onContinue,
}: PrioritizeStepProps) {
  const busyDays = busyDaysFrom(focuses, roomItems);
  const plans = occupiedSlots(focuses, roomItems);
  const { activeDay, onActiveDayChange } = useActivePlanDay();

  const unschedule = (slot: OccupiedSlot) => {
    const next = unschedulePlacement(focuses, roomItems, slot);
    onChange(next.focuses);
    onRoomItemsChange(next.roomItems);
  };
  const [justCheckedId, setJustCheckedId] = useState<string | null>(null);
  const reorder = useReorderDrag((scope, fromId, toId) => {
    if (scope === FOCUS_SCOPE) {
      onChange((current) => reorderById(current, fromId, toId));
      return;
    }
    const focusId = scope.startsWith('actions:') ? scope.slice('actions:'.length) : '';
    if (!focusId) return;
    onChange((current) =>
      current.map((focus) =>
        focus.id === focusId ? { ...focus, actions: reorderById(focus.actions, fromId, toId) } : focus,
      ),
    );
  });

  const totalSelected = focuses.reduce((sum, f) => sum + f.actions.filter((a) => a.checked).length, 0);

  const updateFocus = (focusId: string, patch: Partial<Focus>) => {
    onChange((current) => current.map((f) => (f.id === focusId ? { ...f, ...patch } : f)));
  };

  const updateAction = (focusId: string, actionId: string, patch: Partial<ActionItem>) => {
    onChange((current) =>
      current.map((f) =>
        f.id !== focusId ? f : { ...f, actions: f.actions.map((a) => (a.id === actionId ? { ...a, ...patch } : a)) }
      )
    );
  };

  const removeAction = (focusId: string, actionId: string) => {
    onChange((current) =>
      current.map((f) => (f.id === focusId ? { ...f, actions: f.actions.filter((a) => a.id !== actionId) } : f))
    );
  };

  const addAction = (focusId: string) => {
    const newAction: ActionItem = { id: makeId(), label: '', checked: false, slots: [] };
    onChange((current) => current.map((f) => (f.id === focusId ? { ...f, actions: [...f.actions, newAction] } : f)));
  };

  return (
    <div className="tend-flow__screen">
      <WeekAtAGlance focuses={focuses} roomItems={roomItems} activeDay={activeDay}>
        <div className="tend-flow__body">
          <ProgressHeader step="prioritize" />

          <div className="tend-flow__titles">
            <h1 className="tend-flow__title">What matters most this week?</h1>
            <p className="tend-flow__subtitle">
              You don't have to do everything. Select the actions you want to include in this week's plan. Anything
              you leave unselected can wait for another week.
            </p>
          </div>

          <p className="tend-hint">{totalSelected} actions selected for this week</p>

          <WeekGlancePlace />

          <ReorderStatus message={reorder.announcement} />
          <div className="tend-flow__sections">
            {focuses.map((focus, focusIndex) => {
              const selectedCount = focus.actions.filter((a) => a.checked).length;
              const scope = actionScope(focus.id);
              return (
                <div
                  key={focus.id}
                  className={reorder.rowClass('tend-section', FOCUS_SCOPE, focus.id)}
                  {...reorder.rowProps(FOCUS_SCOPE, focus.id)}
                >
                  <div className="tend-section__header">
                    {focuses.length > 1 && (
                      <ReorderHandle
                        label={focus.title}
                        index={focusIndex}
                        count={focuses.length}
                        dragging={reorder.isDragging(FOCUS_SCOPE, focus.id)}
                        onKeyMove={(delta) => onChange((current) => moveById(current, focus.id, delta))}
                        announce={reorder.announce}
                        {...reorder.handleProps(FOCUS_SCOPE, focus.id)}
                      />
                    )}
                    <div className="tend-section__identity">
                      {typeof focus.colorIndex === 'number' && (
                        <span className="tend-focus-dot" data-focus-color={focus.colorIndex} aria-hidden="true" />
                      )}
                      <EditableField
                        variant="title"
                        value={focus.title}
                        ariaLabel={`Edit ${focus.title}`}
                        onCommit={(title) => updateFocus(focus.id, { title })}
                      />
                    </div>
                    <span className="tend-section__meta">
                      {selectedCount} of {focus.actions.length} selected
                    </span>
                  </div>

                  <div className="tend-flow__list">
                    {focus.actions.map((action, index) => (
                      <div
                        key={action.id}
                        className={reorder.rowClass('tend-action-row', scope, action.id)}
                        {...reorder.rowProps(scope, action.id)}
                      >
                        <div className="tend-action-row__main">
                          {focus.actions.length > 1 && (
                            <ReorderHandle
                              label={action.label || 'new action'}
                              index={index}
                              count={focus.actions.length}
                              dragging={reorder.isDragging(scope, action.id)}
                              onKeyMove={(delta) =>
                                onChange((current) =>
                                  current.map((item) =>
                                    item.id === focus.id ? { ...item, actions: moveById(item.actions, action.id, delta) } : item,
                                  ),
                                )
                              }
                              announce={reorder.announce}
                              {...reorder.handleProps(scope, action.id)}
                            />
                          )}
                          <label className="tend-check">
                            <input
                              type="checkbox"
                              checked={action.checked}
                              onChange={() => {
                                const next = !action.checked;
                                updateAction(focus.id, action.id, { checked: next });
                                setJustCheckedId(next ? action.id : null);
                              }}
                              className="tend-checkbox"
                            />
                            <span className="tend-sr-only">Choose {action.label}</span>
                          </label>
                          <div className="tend-action-row__stack">
                            <div className="tend-action-row__line">
                              <EditableField
                                value={action.label}
                                ariaLabel={action.label ? `Edit ${action.label}` : 'New action'}
                                autoFocusEdit={action.label === ''}
                                onCommit={(label) => updateAction(focus.id, action.id, { label })}
                                onDelete={() => removeAction(focus.id, action.id)}
                              />
                              <button
                                type="button"
                                aria-label={`Remove ${action.label}`}
                                onClick={() => removeAction(focus.id, action.id)}
                                className="tend-icon-button"
                              >
                                ×
                              </button>
                            </div>
                            {action.checked && (
                              <ScheduleControl
                                slots={action.slots}
                                busyDays={busyDays}
                                occupied={plans.filter((planned) => planned.sourceId !== action.id)}
                                sourceId={action.id}
                                onActiveDayChange={onActiveDayChange}
                                defaultOpen={justCheckedId === action.id}
                                onChange={(slots: ScheduleSlot[]) => updateAction(focus.id, action.id, { slots })}
                                onUnschedule={unschedule}
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    ))}

                    <button type="button" className="tend-button-ghost" onClick={() => addAction(focus.id)}>
                      + Add action
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </WeekAtAGlance>

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

import { useState, type Dispatch, type SetStateAction } from 'react';
import { ProgressHeader } from './ProgressHeader';
import { IntentionControl } from './IntentionControl';
import { ScheduleControl } from './ScheduleControl';
import { useActivePlanDay, WeekAtAGlance, WeekGlancePlace } from './WeekAtAGlance';
import { EditableField } from '@/components/ui/EditableField';
import { ReorderHandle, ReorderStatus, useReorderDrag } from './ReorderHandle';
import { moveById, reorderById } from './reorder';
import type { Focus, RoomItem, ScheduleSlot } from '@tend/core';
import { makeId } from '@/lib/make-id';
import { busyDaysFrom, occupiedSlots, unschedulePlacement, type OccupiedSlot } from './busy-days';

interface MakeRoomStepProps {
  focuses: Focus[];
  items: RoomItem[];
  onChange: Dispatch<SetStateAction<RoomItem[]>>;
  onFocusesChange: Dispatch<SetStateAction<Focus[]>>;
  onBack: () => void;
  onContinue: () => void;
}

/**
 * Step 4 — "What do you want to make room for?" The life-outside-goals
 * counterpart to step 3: friends, rest, play. Each item can get days and
 * times too, the same way a task can — Tend should help protect room for
 * life, not only schedule productive actions.
 */
const ROOM_SCOPE = 'room';

export function MakeRoomStep({ focuses, items, onChange, onFocusesChange, onBack, onContinue }: MakeRoomStepProps) {
  const busyDays = busyDaysFrom(focuses, items);
  const plans = occupiedSlots(focuses, items);
  const { activeDay, onActiveDayChange } = useActivePlanDay();

  const unschedule = (slot: OccupiedSlot) => {
    const next = unschedulePlacement(focuses, items, slot);
    onFocusesChange(next.focuses);
    onChange(next.roomItems);
  };
  const [draft, setDraft] = useState('');
  const reorder = useReorderDrag((scope, fromId, toId) => {
    if (scope !== ROOM_SCOPE) return;
    onChange((current) => reorderById(current, fromId, toId));
  });

  const addItem = () => {
    const text = draft.trim();
    if (!text) return;
    onChange((current) => [...current, { id: makeId(), label: text, slots: [] }]);
    setDraft('');
  };

  const removeItem = (id: string) => {
    onChange((current) => current.filter((i) => i.id !== id));
  };

  const updateItem = (id: string, patch: Partial<RoomItem>) => {
    onChange((current) => current.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  };

  return (
    <div className="tend-flow__screen">
      <WeekAtAGlance focuses={focuses} roomItems={items} activeDay={activeDay}>
        <div className="tend-flow__body">
          <ProgressHeader step="makeRoom" />

          <div className="tend-flow__titles">
            <h1 className="tend-flow__title">What do you want to make room for?</h1>
            <p className="tend-flow__subtitle">
            Friends, rest, play, empty time — the things that don't show up on a to-do list, but matter just as much. Add anything you want to make space for this week.
            </p>
          </div>

          <WeekGlancePlace />

          <div className="tend-flow__add-row">
            <input
              type="text"
              aria-label="Add something to make room for"
              placeholder="e.g. Beach walk"
              value={draft}
              autoFocus
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') addItem();
              }}
              className="tend-input"
            />
            <button type="button" onClick={addItem} className="tend-button-primary">
              Add
            </button>
          </div>

          <ReorderStatus message={reorder.announcement} />
          <div className="tend-flow__list">
            {items.map((item, index) => (
              <div
                key={item.id}
                className={reorder.rowClass('tend-action-row tend-action-row--room', ROOM_SCOPE, item.id)}
                {...reorder.rowProps(ROOM_SCOPE, item.id)}
              >
                <div className="tend-action-row__main">
                  {items.length > 1 && (
                    <ReorderHandle
                      label={item.label}
                      index={index}
                      count={items.length}
                      dragging={reorder.isDragging(ROOM_SCOPE, item.id)}
                      onKeyMove={(delta) => onChange((current) => moveById(current, item.id, delta))}
                      announce={reorder.announce}
                      {...reorder.handleProps(ROOM_SCOPE, item.id)}
                    />
                  )}
                  <div className="tend-action-row__stack">
                    <div className="tend-action-row__line">
                      <EditableField
                        value={item.label}
                        ariaLabel={`Edit ${item.label}`}
                        onCommit={(label) => updateItem(item.id, { label })}
                        onDelete={() => removeItem(item.id)}
                      />
                      <button
                        type="button"
                        aria-label={`Remove ${item.label}`}
                        onClick={() => removeItem(item.id)}
                        className="tend-icon-button"
                      >
                        ×
                      </button>
                    </div>
                    <div className="tend-room-controls">
                      <ScheduleControl
                        slots={item.slots}
                        busyDays={busyDays}
                        occupied={plans.filter((planned) => planned.sourceId !== item.id)}
                        sourceId={item.id}
                        onActiveDayChange={onActiveDayChange}
                        onChange={(slots: ScheduleSlot[]) => updateItem(item.id, { slots })}
                        onUnschedule={unschedule}
                      />
                      <IntentionControl
                        label={item.label}
                        intention={item.intention}
                        onChange={(intention) => updateItem(item.id, { intention })}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </WeekAtAGlance>

      <div className="tend-flow__footer tend-flow__footer--split">
        <div className="tend-flow__footer-inner">
          <button type="button" className="tend-flow__back-link" onClick={onBack}>
            ‹ Back
          </button>
          <button type="button" className="tend-button-primary" onClick={onContinue}>
            See your week
          </button>
        </div>
      </div>
    </div>
  );
}

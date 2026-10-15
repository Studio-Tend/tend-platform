'use client';

import {
  DAYPARTS,
  DAYS,
  laneInsertionIndex,
  laneItems,
  layoutWeekBoard,
  copyWeekPlacement,
  moveWeekPlacement,
  removeWeekPlacement,
  placementKey,
  type Day,
  type Daypart,
  type Focus,
  type RoomItem,
  type WeekBoard,
  type WeekLane,
  type WeekPlacement,
} from '@tend/core';
import { useEffect, useId, useMemo, useRef, useState, type CSSProperties, type DragEvent, type KeyboardEvent } from 'react';
import { upcomingMonday } from '@/lib/calendar/upcoming-monday';
import { makeId } from '@/lib/make-id';
import { useKeyboardInset } from '@/lib/use-keyboard-inset';
import { useMediaQuery } from '@/lib/use-media-query';
import {
  EMPTY_DAY_LABEL,
  WEEK_EMAIL_INTRO,
  emailDayHeading,
  emailDayStamp,
  emailWeekRangeLabel,
} from '@/lib/email/week-layout';
import { UndoToast } from '@/components/ui/UndoToast';
import { useDialogModal } from '@/lib/use-dialog-modal';
import { ProgressHeader } from './ProgressHeader';
import { SendWeekForm } from './SendWeekForm';
import { EditGoalDrawer } from './EditGoal';
import { focusForAction, replaceFocus } from './edit-goal';
import { WeekDuplicateEditor, WeekMoveEditor, spotPhrase, type MoveSlot } from './WeekMoveEditor';

interface YourWeekStepProps {
  focuses: Focus[];
  roomItems: RoomItem[];
  onPlanChange: (next: { focuses: Focus[]; roomItems: RoomItem[] }) => void;
  onBack: () => void;
  onSend?: (email: string) => void;
  /** Clears this week's plan and returns to the first step. */
  onStartOver?: () => void;
}

/** Times across the board, including "anytime" (a day with no time of day). */
const BOARD_TIMES: (Daypart | null)[] = [...DAYPARTS, null];

/** Matches the stacked week layout in `tend-flow.css`. */
const COMPACT_VIEWPORT = '(max-width: 760px)';

/** Desktop edit hint. Narrow screens omit it; the modifier matches the keyboard. */
export function weekEditHint(userAgent: string): string {
  const apple = /Mac|iPhone|iPad|iPod/.test(userAgent);
  const key = apple ? '⌥' : 'Alt';
  return `Drag to move · hold ${key} to copy · right-click for more`;
}

type Dragging = {
  item: WeekPlacement;
  copy: boolean;
  over: MoveSlot | null;
};

/**
 * Step 5 — "Your week." The week opens as a read-only agenda. Edit week
 * switches to the board: on a wide screen, drag a card to another cell (hold
 * Alt or ⌥ to copy) or right-click it to pick a day and time. On a narrow
 * screen, one day shows at a time and the card opens that same editor as a
 * sheet. Anything without a day sits in Unscheduled while editing.
 */
export function YourWeekStep({ focuses, roomItems, onPlanChange, onBack, onSend, onStartOver }: YourWeekStepProps) {
  const board = layoutWeekBoard(focuses, roomItems);
  const weekStart = useMemo(
    () => upcomingMonday(new Date(), Intl.DateTimeFormat().resolvedOptions().timeZone),
    [],
  );
  const compact = useMediaQuery(COMPACT_VIEWPORT);
  const keyboardInset = useKeyboardInset();
  const [emailExpanded, setEmailExpanded] = useState(false);
  const [visibleDay, setVisibleDay] = useState<Day>('Mon');
  const [editor, setEditor] = useState<WeekPlacement | null>(null);
  const [goalEditId, setGoalEditId] = useState<string | null>(null);
  const [duplicateOf, setDuplicateOf] = useState<WeekPlacement | null>(null);
  const [duplicateNotice, setDuplicateNotice] = useState('');
  const [drag, setDrag] = useState<Dragging | null>(null);
  const [editing, setEditing] = useState(false);
  const [startOverOpen, setStartOverOpen] = useState(false);
  const [status, setStatus] = useState('');
  const [undoToast, setUndoToast] = useState<{
    id: number;
    message: string;
    label: string;
    previous: { focuses: Focus[]; roomItems: RoomItem[] };
  } | null>(null);
  const stripId = useId();
  const dragging = useRef(false);
  const dragRef = useRef<Dragging | null>(null);
  const altHeld = useRef(false);
  const dropped = useRef(false);
  const boardRef = useRef<HTMLDivElement | null>(null);
  const pendingFocus = useRef<string | null>(null);
  const returnFocus = useRef<string | null>(null);

  const commit = (
    next: { focuses: Focus[]; roomItems: RoomItem[] },
    message: string,
    label: string,
  ) => {
    setUndoToast((current) => ({
      id: (current?.id ?? 0) + 1,
      message,
      label,
      previous: { focuses, roomItems },
    }));
    onPlanChange(next);
    setEditor(null);
    setDuplicateOf(null);
    setDuplicateNotice('');
    setStatus(`${message}. Undo to restore it.`);
  };

  const openEditor = (item: WeekPlacement) => {
    returnFocus.current = item.key;
    setDuplicateOf(null);
    setDuplicateNotice('');
    setEditor(item);
  };

  const closeEditor = () => setEditor(null);

  const openGoalEditor = (item: WeekPlacement) => {
    const focus = focusForAction(focuses, item.sourceId);
    if (!focus) return;
    returnFocus.current = item.key;
    setDuplicateOf(null);
    setDuplicateNotice('');
    setEditor(null);
    setGoalEditId(focus.id);
  };

  const editingGoal = goalEditId ? (focuses.find((focus) => focus.id === goalEditId) ?? null) : null;

  const askDuplicate = () => {
    if (!editor) return;
    setDuplicateNotice('');
    if (!editor.day) setStatus(`${editor.label} needs a day before it can be duplicated.`);
    setDuplicateOf(editor);
    setEditor(null);
  };

  const closeDuplicate = () => {
    setDuplicateOf(null);
    setDuplicateNotice('');
  };

  // After the editor closes, put focus back on the card. A toast takes focus
  // for Undo instead, so a delete or a move doesn't fight it.
  useEffect(() => {
    if (editor || duplicateOf || goalEditId) return;
    const key = pendingFocus.current ?? returnFocus.current;
    if (!key) return;
    pendingFocus.current = null;
    returnFocus.current = null;
    if (undoToast) return;
    const cards = boardRef.current?.querySelectorAll<HTMLButtonElement>('[data-placement-key]');
    Array.from(cards ?? [])
      .find((card) => card.dataset.placementKey === key)
      ?.focus();
  });

  useEffect(() => {
    if (!startOverOpen) return;
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') setStartOverOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [startOverOpen]);

  // Alt can go down before the drag starts, and a dragover in some
  // environments doesn't report altKey. Remember the key either way.
  useEffect(() => {
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Alt') return;
      altHeld.current = event.type === 'keydown';
      const current = dragRef.current;
      if (!current || current.copy === altHeld.current) return;
      const next = { ...current, copy: altHeld.current };
      dragRef.current = next;
      setDrag(next);
      if (next.over) {
        const verb = next.copy ? 'Copying' : 'Moving';
        setStatus(`${verb} ${next.item.label} to ${spotPhrase(next.over.day, next.over.daypart)}.`);
      }
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onKey);
    };
  }, []);

  const clearDrag = () => {
    dragRef.current = null;
    setDrag(null);
  };

  const finishEditing = () => {
    setEditing(false);
    setEditor(null);
    setGoalEditId(null);
    setDuplicateOf(null);
    setDuplicateNotice('');
    dragging.current = false;
    dropped.current = false;
    clearDrag();
    setStatus('Done editing.');
  };

  // A drag can end in a click on the card. Swallow that click so the editor
  // doesn't open on top of the drop.
  const consumeDragClick = () => {
    if (!dragging.current) return false;
    dragging.current = false;
    return true;
  };

  const beginDrag = (item: WeekPlacement, event: DragEvent) => {
    dragging.current = true;
    event.dataTransfer.setData('text/plain', item.key);
    event.dataTransfer.effectAllowed = 'copyMove';
    const next = { item, copy: event.altKey || altHeld.current, over: null };
    dragRef.current = next;
    setDrag(next);
  };

  const copying = (event: { altKey: boolean }) => event.altKey || altHeld.current;

  const hoverSlot = (slot: MoveSlot, copy: boolean) => {
    const current = dragRef.current;
    if (!current) return;
    if (
      current.copy === copy &&
      current.over?.day === slot.day &&
      current.over?.daypart === slot.daypart
    ) {
      return;
    }
    const next = { ...current, copy, over: slot };
    dragRef.current = next;
    setDrag(next);
    const verb = copy ? 'Copying' : 'Moving';
    setStatus(`${verb} ${current.item.label} to ${spotPhrase(slot.day, slot.daypart)}.`);
  };

  const endDrag = (event: DragEvent) => {
    const didDrop = dropped.current;
    dropped.current = false;
    clearDrag();
    if (!didDrop) setStatus('');
    // A click can be synthesized after dragend. Ignore that one.
    window.setTimeout(() => {
      dragging.current = false;
    }, 0);
    event.stopPropagation();
  };

  const place = (from: WeekPlacement, slot: MoveSlot, copy: boolean, before?: WeekPlacement) => {
    const sameCard = Boolean(before && before.key === from.key);
    const sameLane = from.day === slot.day && from.daypart === slot.daypart;
    if (!copy && (sameCard || (sameLane && !before))) {
      setStatus('');
      return;
    }

    const index = laneInsertionIndex(
      laneItems(board, slot.day, slot.daypart),
      from.sourceId,
      sameLane,
      before?.sourceId,
    );
    const destination = { day: slot.day, daypart: slot.daypart, index };

    if (copy) {
      const next = copyWeekPlacement(focuses, roomItems, from, destination, makeId());
      if (next.focuses === focuses && next.roomItems === roomItems) {
        setStatus(
          from.day
            ? `${from.label} is already on ${spotPhrase(slot.day, slot.daypart)}.`
            : `${from.label} needs a day before it can be duplicated.`,
        );
        return;
      }
      commit(next, `${from.label} copied to ${spotPhrase(slot.day, slot.daypart)}`, from.label);
      return;
    }

    pendingFocus.current = placementKey(from.sourceId, slot.day, slot.daypart);
    returnFocus.current = null;
    commit(
      moveWeekPlacement(focuses, roomItems, from, destination),
      `${from.label} moved to ${spotPhrase(slot.day, slot.daypart)}`,
      from.label,
    );
  };

  const addCopies = (from: WeekPlacement, slots: MoveSlot[]) => {
    let nextFocuses = focuses;
    let nextRoomItems = roomItems;
    const added: MoveSlot[] = [];
    for (const slot of slots) {
      const lane = laneItems(layoutWeekBoard(nextFocuses, nextRoomItems), slot.day, slot.daypart);
      const index = laneInsertionIndex(lane, from.sourceId, false);
      const result = copyWeekPlacement(
        nextFocuses,
        nextRoomItems,
        from,
        { day: slot.day, daypart: slot.daypart, index },
        makeId(),
      );
      if (result.focuses === nextFocuses && result.roomItems === nextRoomItems) continue;
      nextFocuses = result.focuses;
      nextRoomItems = result.roomItems;
      added.push(slot);
    }
    if (added.length === 0) {
      const places = slots.map((slot) => spotPhrase(slot.day, slot.daypart));
      const where =
        places.length === 1
          ? places[0]
          : `${places.slice(0, -1).join(', ')} and ${places[places.length - 1]}`;
      const notice = from.day
        ? `${from.label} is already on ${where}.`
        : `${from.label} needs a day before it can be duplicated.`;
      setDuplicateNotice(notice);
      setStatus(notice);
      return;
    }
    const places = added.map((slot) => spotPhrase(slot.day, slot.daypart));
    const where =
      places.length === 1
        ? places[0]
        : places.length === 2
          ? `${places[0]} and ${places[1]}`
          : `${places.slice(0, -1).join(', ')}, and ${places[places.length - 1]}`;
    commit({ focuses: nextFocuses, roomItems: nextRoomItems }, `${from.label} copied to ${where}`, from.label);
  };

  const dropOn = (slot: MoveSlot, before: WeekPlacement | undefined, event: DragEvent) => {
    const current = dragRef.current;
    if (!current) return;
    event.preventDefault();
    event.stopPropagation();
    dropped.current = true;
    const copy = copying(event);
    clearDrag();
    place(current.item, slot, copy, before);
  };

  const dragPill =
    drag?.over &&
    `${drag.copy ? 'Copying' : 'Moving'} ${drag.item.label} to ${spotPhrase(drag.over.day, drag.over.daypart)}`;

  const showUnscheduled = !compact || board.unscheduled.length > 0 || Boolean(drag?.item.day);
  const openKey = editor?.key ?? duplicateOf?.key ?? null;

  return (
    <div
      className="tend-flow__screen"
      style={keyboardInset > 0 ? ({ '--keyboard-inset': `${keyboardInset}px` } as CSSProperties) : undefined}
    >
      <div className="tend-flow__column tend-flow__column--week">
        <div className="tend-flow__body tend-flow__body--compact" ref={boardRef}>
          <ProgressHeader step="yourWeek" />

          <div className="tend-flow__titles">
            <div className="tend-week__heading">
              <div className="tend-week__heading-text">
                <p className="tend-week__range">{emailWeekRangeLabel(weekStart)}</p>
                <h1 className="tend-flow__title">Your week</h1>
              </div>
              <button
                type="button"
                className="tend-button-ghost tend-week__edit"
                aria-pressed={editing}
                onClick={() => {
                  if (editing) {
                    finishEditing();
                    return;
                  }
                  setEditing(true);
                  setStatus('Editing your week.');
                }}
              >
                {editing ? 'Done' : 'Edit week'}
              </button>
            </div>
            <div className="tend-week__intro">
              <p className="tend-flow__subtitle">{WEEK_EMAIL_INTRO}</p>
              {editing && !compact ? (
                <p className="tend-week__hint">
                  {weekEditHint(typeof navigator === 'undefined' ? '' : navigator.userAgent)}
                </p>
              ) : null}
            </div>
          </div>

          <div className="tend-sr-only" role="status" aria-live="polite">
            {status}
          </div>

          {editing && compact ? (
            <>
              <DayStrip
                stripId={stripId}
                days={board.days}
                weekStart={weekStart}
                visibleDay={visibleDay}
                onSelect={setVisibleDay}
              />
              <div className="tend-week tend-week--single">
                {board.days
                  .filter(({ day }) => day === visibleDay)
                  .map(({ day }) => (
                    <DayAgenda
                      key={day}
                      day={day}
                      weekStart={weekStart}
                      panel={{ id: `${stripId}-panel`, labelledBy: `${stripId}-${day}` }}
                      itemsFor={(daypart) => laneItems(board, day, daypart)}
                      drag={drag}
                      editorKey={openKey}
                      onOpen={openEditor}
                      onEditGoal={openGoalEditor}
                      onBeginDrag={beginDrag}
                      onHover={hoverSlot}
                      wantsCopy={copying}
                      onDrop={dropOn}
                      onDragEnd={endDrag}
                      ignoreClick={consumeDragClick}
                    />
                  ))}
              </div>
            </>
          ) : editing ? (
            <div className="tend-week-layout">
              <div className="tend-week-matrix">
                <div className="tend-week-matrix__head">
                  <div className="tend-week-matrix__corner" />
                  {board.days.map(({ day }) => {
                    const stamp = emailDayStamp(day, weekStart);
                    return (
                        <div
                          key={day}
                          className="tend-week__date"
                          role="columnheader"
                          data-week-column={day}
                          aria-label={`${stamp.weekday} ${stamp.date}`}
                        >
                        <span className="tend-week__weekday">{stamp.weekday}</span>
                        <span className="tend-week__date-num">{stamp.date}</span>
                      </div>
                    );
                  })}
                </div>
                {BOARD_TIMES.map((daypart) => (
                  <div key={daypart ?? 'anytime'} className="tend-week-matrix__row">
                    <h3 className="tend-week-matrix__time">{timeLabel(daypart)}</h3>
                    {board.days.map(({ day }) => (
                      <WeekCell
                        key={`${day}:${daypart ?? 'anytime'}`}
                        day={day}
                        daypart={daypart}
                        weekStart={weekStart}
                        items={laneItems(board, day, daypart)}
                        drag={drag}
                        editorKey={openKey}
                        onOpen={openEditor}
                      onEditGoal={openGoalEditor}
                        onBeginDrag={beginDrag}
                        onHover={hoverSlot}
                        wantsCopy={copying}
                        onDrop={dropOn}
                        onDragEnd={endDrag}
                        ignoreClick={consumeDragClick}
                      />
                    ))}
                  </div>
                ))}
              </div>
              {showUnscheduled ? (
                <UnscheduledLane
                  items={board.unscheduled}
                  compact={false}
                  drag={drag}
                  editorKey={openKey}
                  onOpen={openEditor}
                      onEditGoal={openGoalEditor}
                  onBeginDrag={beginDrag}
                  onHover={hoverSlot}
                  wantsCopy={copying}
                  onDrop={dropOn}
                  onDragEnd={endDrag}
                  ignoreClick={consumeDragClick}
                />
              ) : null}
              {dragPill ? (
                <p className="tend-week-drag-pill" aria-hidden="true">
                  {dragPill}
                </p>
              ) : null}
            </div>
          ) : (
            <WeekRead
              board={board}
              weekStart={weekStart}
              compact={compact}
              stripId={stripId}
              visibleDay={visibleDay}
              onSelectDay={setVisibleDay}
            />
          )}

          {editing && compact && showUnscheduled ? (
            <UnscheduledLane
              items={board.unscheduled}
              compact
              drag={drag}
              editorKey={openKey}
              onOpen={openEditor}
                      onEditGoal={openGoalEditor}
              onBeginDrag={beginDrag}
              onHover={hoverSlot}
              wantsCopy={copying}
              onDrop={dropOn}
              onDragEnd={endDrag}
              ignoreClick={consumeDragClick}
            />
          ) : null}

          {onStartOver ? (
            <div className={`tend-week__secondary${editing ? ' tend-week__secondary--edit' : ''}`}>
              <button
                type="button"
                className="tend-button-ghost tend-week__start-over"
                onClick={() => setStartOverOpen(true)}
              >
                Start this week over
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <div className="tend-flow__footer tend-flow__footer--split tend-flow__footer--week">
        {undoToast ? (
          <UndoToast
            key={undoToast.id}
            message={undoToast.message}
            onUndo={() => {
              onPlanChange(undoToast.previous);
              setUndoToast(null);
              setEditor(null);
              pendingFocus.current = null;
              returnFocus.current = null;
              setStatus(`${undoToast.label} restored.`);
            }}
            onDismiss={() => setUndoToast(null)}
          />
        ) : null}
        <div className="tend-flow__footer-inner">
          {emailExpanded ? null : (
            <button type="button" className="tend-flow__back-link" onClick={onBack}>
              ‹ Back
            </button>
          )}
          <SendWeekForm
            focuses={focuses}
            roomItems={roomItems}
            onSent={onSend}
            onSendClick={() => {
              if (editing) finishEditing();
            }}
            onExpandedChange={(expanded) => {
              setEmailExpanded(expanded);
              if (expanded && editing) finishEditing();
            }}
          />
        </div>
      </div>

      {editingGoal ? (
        <EditGoalDrawer
          key={editingGoal.id}
          goal={editingGoal}
          onSave={(next) => {
            onPlanChange({ focuses: replaceFocus(focuses, next), roomItems });
            setGoalEditId(null);
          }}
          onClose={() => setGoalEditId(null)}
        />
      ) : null}

      {editor ? (
        <WeekMoveEditor
          key={editor.key}
          item={editor}
          weekStart={weekStart}
          compact={compact}
          onMove={(slot) => place(editor, slot, false)}
          onDuplicate={askDuplicate}
          onDelete={() => {
            pendingFocus.current = null;
            returnFocus.current = null;
            commit(removeWeekPlacement(focuses, roomItems, editor), `${editor.label} removed`, editor.label);
          }}
          onDismiss={closeEditor}
        />
      ) : null}

      {duplicateOf ? (
        <WeekDuplicateEditor
          key={duplicateOf.key}
          item={duplicateOf}
          weekStart={weekStart}
          compact={compact}
          notice={duplicateNotice}
          onAdd={(slots) => addCopies(duplicateOf, slots)}
          onDismiss={closeDuplicate}
        />
      ) : null}

      {onStartOver && (
        <StartOverDialog
          open={startOverOpen}
          onDismiss={() => setStartOverOpen(false)}
          onConfirm={onStartOver}
        />
      )}
    </div>
  );
}

function timeLabel(daypart: Daypart | null): string {
  return daypart ?? 'Anytime';
}

function filledLanes(lanes: WeekLane[]): WeekLane[] {
  return lanes.filter((lane) => lane.items.length > 0);
}

/** The week as a quiet agenda. Editing is a separate board. */
function WeekRead({
  board,
  weekStart,
  compact,
  stripId,
  visibleDay,
  onSelectDay,
}: {
  board: WeekBoard;
  weekStart: string;
  compact: boolean;
  stripId: string;
  visibleDay: Day;
  onSelectDay: (day: Day) => void;
}) {
  if (compact) {
    const day = board.days.find((entry) => entry.day === visibleDay);
    return (
      <>
        <DayStrip
          stripId={stripId}
          days={board.days}
          weekStart={weekStart}
          visibleDay={visibleDay}
          onSelect={onSelectDay}
        />
        <div className="tend-week tend-week--single">
          <section
            className="tend-week__day"
            id={`${stripId}-panel`}
            role="tabpanel"
            aria-labelledby={`${stripId}-${visibleDay}`}
          >
            <h2 className="tend-week__day-heading">{emailDayHeading(visibleDay, weekStart)}</h2>
            <div className="tend-week-read__events">
              <ReadLanes lanes={day?.lanes ?? []} />
            </div>
          </section>
        </div>
        <ReadUnscheduled items={board.unscheduled} />
      </>
    );
  }

  return (
    <>
      <div className="tend-week-read">
        {board.days.map(({ day, lanes }) => {
          const stamp = emailDayStamp(day, weekStart);
          return (
            <section key={day} className="tend-week-read__day" aria-label={emailDayHeading(day, weekStart)}>
              <div className="tend-week-read__date">
                <span className="tend-week__weekday">{stamp.weekday}</span>
                <span className="tend-week__date-num">{stamp.date}</span>
              </div>
              <div className="tend-week-read__events">
                <ReadLanes lanes={lanes} quietEmpty />
              </div>
            </section>
          );
        })}
      </div>
      <ReadUnscheduled items={board.unscheduled} />
    </>
  );
}

function ReadLanes({ lanes, quietEmpty = false }: { lanes: WeekLane[]; quietEmpty?: boolean }) {
  const filled = filledLanes(lanes);
  if (filled.length === 0) {
    return quietEmpty ? null : <p className="tend-week__empty">{EMPTY_DAY_LABEL}</p>;
  }
  return (
    <>
      {filled.map((lane) => (
        <div key={lane.daypart ?? 'anytime'} className="tend-week-read__lane">
          <h3 className="tend-week__lane-label">{timeLabel(lane.daypart)}</h3>
          {lane.items.map((item) => (
            <ReadItem key={item.key} item={item} />
          ))}
        </div>
      ))}
    </>
  );
}

function ReadItem({ item }: { item: WeekPlacement }) {
  const isRoom = item.kind === 'room';
  const subtitle = itemSubtitle(item);
  return (
    <p className={`tend-week-read__item${isRoom ? ' tend-week-read__item--life' : ''}`}>
      <span className="tend-week__item-title">
        {isRoom ? (
          <span className="tend-room-marker" aria-hidden="true">
            ✦{' '}
          </span>
        ) : null}
        {item.label}
      </span>
      {subtitle ? <span className="tend-week__item-meta">{subtitle}</span> : null}
    </p>
  );
}

function ReadUnscheduled({ items }: { items: WeekPlacement[] }) {
  if (items.length === 0) return null;
  return (
    <section className="tend-week-read__open" aria-label="Not yet scheduled">
      <h2 className="tend-week-unscheduled__label">Not yet scheduled</h2>
      <div className="tend-week-read__open-items">
        {items.map((item) => (
          <ReadItem key={item.key} item={item} />
        ))}
      </div>
    </section>
  );
}

function timePhrase(daypart: Daypart | null): string {
  return daypart ? daypart.toLowerCase() : 'anytime';
}

function placePhrase(day: Day | null, daypart: Daypart | null): string {
  if (!day) return 'not yet scheduled';
  return `${day} ${timePhrase(daypart)}`;
}

function itemSubtitle(item: WeekPlacement): string | undefined {
  return item.kind === 'task' ? item.focusTitle : item.intention;
}

function itemName(item: WeekPlacement): string {
  const when = placePhrase(item.day, item.daypart);
  const subtitle = itemSubtitle(item);
  return `${item.label}, ${when}${subtitle ? `. ${subtitle}` : ''}`;
}

function slotLabel(day: Day, daypart: Daypart | null, weekStart: string): string {
  return `${emailDayHeading(day, weekStart)}, ${timePhrase(daypart)}`;
}

function isOver(drag: Dragging | null, slot: MoveSlot): boolean {
  return Boolean(drag?.over && drag.over.day === slot.day && drag.over.daypart === slot.daypart);
}

function isOrigin(drag: Dragging | null, slot: MoveSlot): boolean {
  return Boolean(drag && drag.item.day === slot.day && drag.item.daypart === slot.daypart);
}

interface BoardDrag {
  drag: Dragging | null;
  editorKey: string | null;
  onOpen: (item: WeekPlacement) => void;
  onEditGoal: (item: WeekPlacement) => void;
  onBeginDrag: (item: WeekPlacement, event: DragEvent) => void;
  onHover: (slot: MoveSlot, copy: boolean) => void;
  wantsCopy: (event: { altKey: boolean }) => boolean;
  onDrop: (slot: MoveSlot, before: WeekPlacement | undefined, event: DragEvent) => void;
  onDragEnd: (event: DragEvent) => void;
  ignoreClick: () => boolean;
}

function WeekCell({
  day,
  daypart,
  weekStart,
  items,
  drag,
  editorKey,
  onOpen,
  onEditGoal,
  onBeginDrag,
  onHover,
  wantsCopy,
  onDrop,
  onDragEnd,
  ignoreClick,
}: BoardDrag & {
  day: Day;
  daypart: Daypart | null;
  weekStart: string;
  items: WeekPlacement[];
}) {
  const slot = { day, daypart };
  const origin = isOrigin(drag, slot);
  const drop = isOver(drag, slot) && !origin;
  return (
    <div
      className={`tend-week-cell${drop ? ' tend-week-cell--drop' : ''}`}
      role="group"
      aria-label={slotLabel(day, daypart, weekStart)}
      onDragOver={(event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = wantsCopy(event) ? 'copy' : 'move';
        onHover(slot, wantsCopy(event));
      }}
      onDrop={(event) => onDrop(slot, undefined, event)}
    >
      {items.map((item) => (
        <WeekCard
          key={item.key}
          item={item}
          compact={false}
          lifted={drag?.item.key === item.key}
          expanded={editorKey === item.key}
          onOpen={onOpen}
          onEditGoal={onEditGoal}
          onBeginDrag={onBeginDrag}
          onHover={onHover}
          wantsCopy={wantsCopy}
          onDrop={onDrop}
          onDragEnd={onDragEnd}
          ignoreClick={ignoreClick}
        />
      ))}
    </div>
  );
}

function WeekCard({
  item,
  compact,
  lifted,
  expanded,
  onOpen,
  onEditGoal,
  onBeginDrag,
  onHover,
  wantsCopy,
  onDrop,
  onDragEnd,
  ignoreClick,
}: {
  item: WeekPlacement;
  compact: boolean;
  lifted: boolean;
  expanded: boolean;
} & Omit<BoardDrag, 'drag' | 'editorKey'>) {
  const isRoom = item.kind === 'room';
  const goalTitle = item.kind === 'task' ? item.focusTitle : undefined;
  const subtitle = itemSubtitle(item);
  const slot = { day: item.day, daypart: item.daypart };
  const open = () => {
    if (ignoreClick()) return;
    onOpen(item);
  };
  return (
    <div
      className={`tend-week__item${isRoom ? ' tend-week__item--life' : ''}${lifted ? ' tend-week__item--lifted' : ''}`}
      draggable
      onClick={open}
      onContextMenu={(event) => {
        event.preventDefault();
        onOpen(item);
      }}
      onDragStart={(event) => {
        if (event.target instanceof Element && event.target.closest('.tend-week__edit-goal')) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }
        onBeginDrag(item, event);
      }}
      onDragEnd={onDragEnd}
      onDragOver={(event) => {
        event.preventDefault();
        event.stopPropagation();
        event.dataTransfer.dropEffect = wantsCopy(event) ? 'copy' : 'move';
        onHover(slot, wantsCopy(event));
      }}
      onDrop={(event) => onDrop(slot, item, event)}
    >
      <div className="tend-week__item-lead">
        <button
          type="button"
          draggable
          data-placement-key={item.key}
          aria-haspopup="dialog"
          aria-expanded={expanded}
          aria-label={itemName(item)}
          className="tend-week__item-open"
          onClick={(event) => {
            event.stopPropagation();
            open();
          }}
          onDragStart={(event) => {
            event.stopPropagation();
            onBeginDrag(item, event);
          }}
        />
        <span className="tend-week__item-title">
          {isRoom && (
            <span className="tend-room-marker" aria-hidden="true">
              ✦{' '}
            </span>
          )}
          {item.label}
        </span>
      </div>
      {subtitle ? <span className="tend-week__item-meta">{subtitle}</span> : null}
      {goalTitle ? (
        <button
          type="button"
          className="tend-week__edit-goal"
          aria-label={`Edit ${goalTitle} goal`}
          draggable={false}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            onEditGoal(item);
          }}
          onDragStart={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
        >
          <PencilIcon />
          <span className="tend-week__tip" role="tooltip">
            Edit goal
          </span>
        </button>
      ) : null}
      {compact ? (
        <span className="tend-week__chevron" aria-hidden="true">
          ›
        </span>
      ) : (
        <Grip />
      )}
    </div>
  );
}

function PencilIcon() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
      <path
        d="M11.1 2.2a1.2 1.2 0 0 1 1.7 1.7L6.1 10.6 3.6 11.4l.8-2.5 6.7-6.7Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinejoin="round"
      />
      <path d="M2.75 13.25h10.5" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
    </svg>
  );
}

function Grip() {
  return (
    <span className="tend-week__grip" aria-hidden="true">
      <svg viewBox="0 0 16 16" width="1em" height="1em">
        <circle cx="6" cy="3.5" r="1.15" fill="currentColor" />
        <circle cx="10" cy="3.5" r="1.15" fill="currentColor" />
        <circle cx="6" cy="8" r="1.15" fill="currentColor" />
        <circle cx="10" cy="8" r="1.15" fill="currentColor" />
        <circle cx="6" cy="12.5" r="1.15" fill="currentColor" />
        <circle cx="10" cy="12.5" r="1.15" fill="currentColor" />
      </svg>
      <span className="tend-week__tip" role="tooltip">
        Drag to another time
      </span>
    </span>
  );
}

function DayAgenda({
  day,
  weekStart,
  panel,
  itemsFor,
  drag,
  editorKey,
  onOpen,
  onEditGoal,
  onBeginDrag,
  onHover,
  wantsCopy,
  onDrop,
  onDragEnd,
  ignoreClick,
}: BoardDrag & {
  day: Day;
  weekStart: string;
  panel: { id: string; labelledBy: string };
  itemsFor: (daypart: Daypart | null) => WeekPlacement[];
}) {
  const times = BOARD_TIMES.filter((daypart) => itemsFor(daypart).length > 0 || drag !== null);
  return (
    <section
      className="tend-week__day"
      id={panel.id}
      role="tabpanel"
      aria-labelledby={panel.labelledBy}
    >
      <h2 className="tend-week__day-heading">{emailDayHeading(day, weekStart)}</h2>
      {times.length === 0 ? (
        <div className="tend-week__empty">{EMPTY_DAY_LABEL}</div>
      ) : (
        times.map((daypart) => {
          const slot = { day, daypart };
          const items = itemsFor(daypart);
          const origin = isOrigin(drag, slot);
          const drop = isOver(drag, slot) && !origin;
          return (
            <div
              key={daypart ?? 'anytime'}
              className={`tend-week__lane${drop ? ' tend-week__lane--drop' : ''}`}
              role="group"
              aria-label={slotLabel(day, daypart, weekStart)}
              onDragOver={(event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = wantsCopy(event) ? 'copy' : 'move';
                onHover(slot, wantsCopy(event));
              }}
              onDrop={(event) => onDrop(slot, undefined, event)}
            >
              <h3 className="tend-week__lane-label">{timeLabel(daypart)}</h3>
              {items.map((item) => (
                <WeekCard
                  key={item.key}
                  item={item}
                  compact
                  lifted={drag?.item.key === item.key}
                  expanded={editorKey === item.key}
                  onOpen={onOpen}
                  onEditGoal={onEditGoal}
                  onBeginDrag={onBeginDrag}
                  onHover={onHover}
                  wantsCopy={wantsCopy}
                  onDrop={onDrop}
                  onDragEnd={onDragEnd}
                  ignoreClick={ignoreClick}
                />
              ))}
            </div>
          );
        })
      )}
    </section>
  );
}

function UnscheduledLane({
  items,
  compact,
  drag,
  editorKey,
  onOpen,
  onEditGoal,
  onBeginDrag,
  onHover,
  wantsCopy,
  onDrop,
  onDragEnd,
  ignoreClick,
}: BoardDrag & { items: WeekPlacement[]; compact: boolean }) {
  const slot: MoveSlot = { day: null, daypart: null };
  const canDrop = Boolean(drag?.item.day);
  const over = canDrop && isOver(drag, slot);
  return (
    <section
      className={`tend-week-unscheduled${over ? ' tend-week-unscheduled--over' : ''}${
        compact ? ' tend-week-unscheduled--stacked' : ''
      }`}
      aria-label="Unscheduled"
      data-week-column="unscheduled"
      onDragOver={(event) => {
        if (!canDrop) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = wantsCopy(event) ? 'copy' : 'move';
        onHover(slot, wantsCopy(event));
      }}
      onDrop={(event) => {
        if (!canDrop) return;
        onDrop(slot, undefined, event);
      }}
    >
      <div className="tend-week-unscheduled__heading">
        <h2 className="tend-week-unscheduled__label">Unscheduled</h2>
        <span className="tend-week-unscheduled__count">{items.length}</span>
      </div>
      <div className="tend-week-unscheduled__items">
        {items.map((item) => (
          <WeekCard
            key={item.key}
            item={item}
            compact={compact}
            lifted={drag?.item.key === item.key}
            expanded={editorKey === item.key}
            onOpen={onOpen}
            onEditGoal={onEditGoal}
            onBeginDrag={onBeginDrag}
            onHover={onHover}
            wantsCopy={wantsCopy}
            onDrop={onDrop}
            onDragEnd={onDragEnd}
            ignoreClick={ignoreClick}
          />
        ))}
      </div>
      {canDrop ? (
        <div className={`tend-week-unscheduled__drop${over ? ' tend-week-unscheduled__drop--over' : ''}`}>
          Drop here to unschedule
        </div>
      ) : (
        <p className="tend-week-unscheduled__hint">
          {compact
            ? 'Pick a day for one of these.'
            : "Drag an action here when it doesn't have a day yet."}
        </p>
      )}
    </section>
  );
}

function DayStrip({
  stripId,
  days,
  weekStart,
  visibleDay,
  onSelect,
}: {
  stripId: string;
  days: { day: Day; lanes: { items: readonly unknown[] }[] }[];
  weekStart: string;
  visibleDay: Day;
  onSelect: (day: Day) => void;
}) {
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const index = DAYS.indexOf(visibleDay);
    let next = index;
    if (event.key === 'ArrowRight') next = (index + 1) % DAYS.length;
    else if (event.key === 'ArrowLeft') next = (index - 1 + DAYS.length) % DAYS.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = DAYS.length - 1;
    else return;
    event.preventDefault();
    const day = DAYS[next];
    if (!day) return;
    onSelect(day);
    event.currentTarget.querySelector<HTMLButtonElement>(`[data-day="${day}"]`)?.focus();
  };

  return (
    <div className="tend-week-strip" role="tablist" aria-label="Days" onKeyDown={onKeyDown}>
      {days.map(({ day, lanes }) => {
        const selected = day === visibleDay;
        const hasItems = lanes.some((lane) => lane.items.length > 0);
        const stamp = emailDayStamp(day, weekStart);
        return (
          <button
            key={day}
            type="button"
            role="tab"
            id={`${stripId}-${day}`}
            data-day={day}
            aria-selected={selected}
            aria-controls={`${stripId}-panel`}
            aria-label={emailDayHeading(day, weekStart)}
            tabIndex={selected ? 0 : -1}
            className="tend-week-strip__day"
            onClick={() => onSelect(day)}
          >
            <span className="tend-week-strip__weekday" aria-hidden="true">
              {day.slice(0, 1)}
            </span>
            <span className="tend-week-strip__date" aria-hidden="true">
              {stamp.date}
            </span>
            <span
              className={`tend-week-strip__dot${hasItems ? '' : ' tend-week-strip__dot--empty'}`}
              aria-hidden="true"
            />
          </button>
        );
      })}
    </div>
  );
}

function StartOverDialog({
  open,
  onDismiss,
  onConfirm,
}: {
  open: boolean;
  onDismiss: () => void;
  onConfirm: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const keepPlanRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const descId = useId();
  useDialogModal(open, dialogRef, keepPlanRef);

  return (
    <dialog
      ref={dialogRef}
      className="tend-dialog"
      aria-labelledby={titleId}
      aria-describedby={descId}
      onClose={onDismiss}
      onClick={(event) => {
        if (event.target === event.currentTarget) onDismiss();
      }}
    >
      <div className="tend-dialog__card">
        <h2 id={titleId} className="tend-dialog__title">
          Start this week over?
        </h2>
        <p id={descId} className="tend-dialog__body">
          This will clear your focus, actions, and scheduled times for this week so you can make a new plan.
        </p>
        <div className="tend-dialog__actions">
          <button type="button" className="tend-button-primary" onClick={onConfirm}>
            Start over
          </button>
          <button ref={keepPlanRef} type="button" className="tend-button-secondary" onClick={onDismiss}>
            Keep my plan
          </button>
        </div>
        <button type="button" className="tend-icon-button tend-dialog__close" aria-label="Close" onClick={onDismiss}>
          ×
        </button>
      </div>
    </dialog>
  );
}

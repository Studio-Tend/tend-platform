'use client';

import { DAYPARTS, DAYS, type Day, type Daypart, type WeekPlacement } from '@tend/core';
import { useId, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { emailDayHeading, emailDayStamp } from '@/lib/email/week-layout';
import { useDialogModal } from '@/lib/use-dialog-modal';
import { DayOption } from './DayOption';

export type MoveSlot = { day: Day | null; daypart: Daypart | null };

const TIMES: { daypart: Daypart | null; label: string }[] = [
  ...DAYPARTS.map((daypart) => ({ daypart, label: daypart })),
  { daypart: null, label: 'Anytime' },
];

/**
 * Wide screens sit the editor beside the action's column. Sunday is the last
 * column, so it opens to the left; every earlier day opens to the right.
 * An action with no day lives in the column past Sunday, so it opens left too.
 */
export function editorSide(day: Day | null): 'left' | 'right' {
  return day === null || day === 'Sun' ? 'left' : 'right';
}

const EDITOR_GAP = 8;
const EDITOR_MARGIN = 16;

/** Where the popover sits, and the tallest it can be without leaving the viewport. */
export function editorFrame({
  cardTop,
  columnLeft,
  columnRight,
  dialogWidth,
  dialogHeight,
  viewportWidth,
  viewportHeight,
  side,
}: {
  cardTop: number;
  columnLeft: number;
  columnRight: number;
  dialogWidth: number;
  dialogHeight: number;
  viewportWidth: number;
  viewportHeight: number;
  side: 'left' | 'right';
}): { top: number; left: number; maxHeight: number } {
  const maxHeight = Math.max(0, viewportHeight - EDITOR_MARGIN * 2);
  const height = Math.min(dialogHeight, maxHeight);
  const unclampedLeft =
    side === 'right' ? columnRight + EDITOR_GAP : columnLeft - EDITOR_GAP - dialogWidth;
  const maxLeft = viewportWidth - dialogWidth - EDITOR_MARGIN;
  const maxTop = viewportHeight - height - EDITOR_MARGIN;
  return {
    maxHeight,
    left: Math.min(Math.max(unclampedLeft, EDITOR_MARGIN), Math.max(EDITOR_MARGIN, maxLeft)),
    top: Math.min(Math.max(cardTop, EDITOR_MARGIN), Math.max(EDITOR_MARGIN, maxTop)),
  };
}

/**
 * Sits the popover beside the action's column and keeps it inside the viewport.
 * The height cap is applied before measuring, so a dialog taller than the screen
 * reports the capped height and then scrolls inside it.
 */
function placeBesideColumn(dialog: HTMLDialogElement, item: WeekPlacement) {
  dialog.dataset.side = editorSide(item.day);
  const card = document.querySelector<HTMLElement>(
    `[data-placement-key="${CSS.escape(item.key)}"]`,
  );
  const column = document.querySelector<HTMLElement>(
    `[data-week-column="${item.day ?? 'unscheduled'}"]`,
  );
  if (!card || !column) return;

  const available = Math.max(0, window.innerHeight - EDITOR_MARGIN * 2);
  dialog.style.maxHeight = `${available}px`;

  const cardBox = card.getBoundingClientRect();
  const columnBox = column.getBoundingClientRect();
  const dialogBox = dialog.getBoundingClientRect();
  if (dialogBox.width === 0 || columnBox.width === 0) return;

  const frame = editorFrame({
    cardTop: cardBox.top,
    columnLeft: columnBox.left,
    columnRight: columnBox.right,
    dialogWidth: dialogBox.width,
    dialogHeight: dialogBox.height,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    side: editorSide(item.day),
  });
  dialog.style.top = `${frame.top}px`;
  dialog.style.left = `${frame.left}px`;
}

/** Places the popover on open, and again when its content or the window changes size. */
function useBesideColumn(
  dialogRef: RefObject<HTMLDialogElement | null>,
  item: WeekPlacement,
  compact: boolean,
) {
  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || compact) return;
    if (!dialog.open) {
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');
    }

    const place = () => placeBesideColumn(dialog, item);
    place();

    const content = dialog.querySelector<HTMLElement>('.tend-move__card');
    const observer =
      content && typeof ResizeObserver !== 'undefined' ? new ResizeObserver(place) : null;
    if (content) observer?.observe(content);
    window.addEventListener('resize', place);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', place);
    };
  }, [compact, dialogRef, item]);
}

/** "Thu · Afternoon", or "unscheduled" when the action has no day. */
export function spotPhrase(day: Day | null, daypart: Daypart | null): string {
  if (!day) return 'unscheduled';
  return `${day} · ${daypart ?? 'Anytime'}`;
}

function describeMove(from: MoveSlot, to: MoveSlot): string {
  const origin = spotPhrase(from.day, from.daypart);
  if (from.day === to.day && from.daypart === to.daypart) return `Stays on ${origin}.`;
  return `Was ${origin}. Moves to ${spotPhrase(to.day, to.daypart)}.`;
}

type Draft = { day: null } | { day: Day; daypart: Daypart | null };

function draftSlot(draft: Draft): MoveSlot {
  return draft.day === null ? { day: null, daypart: null } : draft;
}

/**
 * Where an action sits in the week. A sheet on a narrow screen, a dialog beside
 * its column on a wide one. Nothing moves until Done — the sentence under the
 * times is the preview. "Duplicate to…" opens a separate picker.
 */
export function WeekMoveEditor({
  item,
  weekStart,
  compact,
  onMove,
  onDuplicate,
  onDelete,
  onDismiss,
}: {
  item: WeekPlacement;
  weekStart: string;
  compact: boolean;
  onMove: (slot: MoveSlot) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onDismiss: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const currentRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const metaId = useId();
  const dayLabelId = useId();
  const timeLabelId = useId();
  const [draft, setDraft] = useState<Draft>(
    item.day ? { day: item.day, daypart: item.daypart } : { day: null },
  );

  useDialogModal(true, dialogRef, currentRef);
  useBesideColumn(dialogRef, item, compact);

  const slot = draftSlot(draft);
  const unchanged = item.day === slot.day && item.daypart === slot.daypart;
  const focusTitle = item.kind === 'task' ? item.focusTitle : item.intention;

  const chooseDay = (day: Day) => {
    setDraft((current) => ({
      day,
      daypart: current.day === null ? 'Morning' : current.daypart,
    }));
  };

  return (
    <dialog
      ref={dialogRef}
      className={compact ? 'tend-sheet tend-move' : 'tend-move tend-move--popover'}
      aria-labelledby={titleId}
      aria-describedby={focusTitle ? metaId : undefined}
      onClose={onDismiss}
      onClick={(event) => {
        if (event.target === event.currentTarget) onDismiss();
      }}
      onKeyDown={(event) => {
        if (event.key !== 'Escape') return;
        event.preventDefault();
        event.stopPropagation();
        onDismiss();
      }}
    >
      <div className="tend-move__card">
        {compact ? <span className="tend-move__grabber" aria-hidden="true" /> : null}
        <div className="tend-move__header">
          <div className="tend-move__heading">
            <h2 id={titleId} className="tend-move__title">
              {item.label}
            </h2>
            {focusTitle ? (
              <p id={metaId} className="tend-move__meta">
                {focusTitle}
              </p>
            ) : null}
          </div>
          <button type="button" className="tend-icon-button" aria-label="Close" onClick={onDismiss}>
            ×
          </button>
        </div>

        <div className="tend-move__section">
          <p className="tend-move__label" id={dayLabelId}>
            Day
          </p>
          <div className="tend-day-options" role="group" aria-labelledby={dayLabelId}>
            {DAYS.map((day) => {
              const stamp = emailDayStamp(day, weekStart);
              const selected = draft.day === day;
              return (
                <DayOption
                  key={day}
                  buttonRef={selected ? currentRef : undefined}
                  name={day}
                  meta={String(stamp.date)}
                  label={emailDayHeading(day, weekStart)}
                  pressed={selected}
                  onSelect={() => chooseDay(day)}
                />
              );
            })}
          </div>
          <button
            ref={draft.day === null ? currentRef : undefined}
            type="button"
            className="tend-move__unscheduled"
            aria-pressed={draft.day === null}
            onClick={() => setDraft({ day: null })}
          >
            Unscheduled
          </button>
        </div>

        <div className="tend-move__section">
          <p className="tend-move__label" id={timeLabelId}>
            Time
          </p>
          {draft.day === null ? (
            <p className="tend-move__note">
              Unscheduled actions wait here until you pick a day. Pick a day to choose a time.
            </p>
          ) : (
            <div className="tend-move__times" role="group" aria-labelledby={timeLabelId}>
              {TIMES.map(({ daypart, label }) => {
                const selected = draft.daypart === daypart;
                return (
                  <button
                    key={label}
                    type="button"
                    className="tend-move__time"
                    aria-pressed={selected}
                    onClick={() => setDraft({ day: draft.day, daypart })}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <p className="tend-move__status" aria-live="polite">
          {describeMove(item, slot)}
        </p>

        <div className="tend-move__footer">
          <button
            type="button"
            className="tend-button-primary tend-move__done"
            onClick={() => (unchanged ? onDismiss() : onMove(slot))}
          >
            Done
          </button>
          <div className="tend-move__links">
            <button type="button" className="tend-button-ghost tend-move__duplicate" onClick={onDuplicate}>
              Duplicate to...
            </button>
            <button type="button" className="tend-button-ghost tend-move__delete" onClick={onDelete}>
              Delete
            </button>
          </div>
        </div>
      </div>
    </dialog>
  );
}

/**
 * Copies an action onto one or more days, or into Unscheduled, without moving
 * the original. Days share one time. The button says Add copy for one
 * destination and Add copies for more, and stays quiet until a day or
 * Unscheduled is chosen. An action with no day yet cannot be copied.
 */
export function WeekDuplicateEditor({
  item,
  weekStart,
  compact,
  notice,
  onAdd,
  onDismiss,
}: {
  item: WeekPlacement;
  weekStart: string;
  compact: boolean;
  notice: string;
  onAdd: (slots: MoveSlot[]) => void;
  onDismiss: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const firstDayRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const metaId = useId();
  const dayLabelId = useId();
  const timeLabelId = useId();
  const [days, setDays] = useState<Day[]>([]);
  const [unscheduled, setUnscheduled] = useState(false);
  const [daypart, setDaypart] = useState<Daypart | null>('Morning');
  const focusTitle = item.kind === 'task' ? item.focusTitle : item.intention;
  const canCopy = Boolean(item.day) && (days.length > 0 || unscheduled);
  const addLabel = days.length + (unscheduled ? 1 : 0) > 1 ? 'Add copies' : 'Add copy';

  useDialogModal(true, dialogRef, firstDayRef);
  useBesideColumn(dialogRef, item, compact);

  const toggleDay = (day: Day) => {
    setDays((current) =>
      current.includes(day) ? current.filter((picked) => picked !== day) : [...current, day],
    );
  };

  const slots = (): MoveSlot[] => [
    ...DAYS.filter((day) => days.includes(day)).map((day) => ({ day, daypart })),
    ...(unscheduled ? [{ day: null, daypart: null }] : []),
  ];

  return (
    <dialog
      ref={dialogRef}
      className={compact ? 'tend-sheet tend-move tend-duplicate' : 'tend-move tend-move--popover tend-duplicate'}
      aria-labelledby={titleId}
      aria-describedby={focusTitle ? metaId : undefined}
      onClose={onDismiss}
      onClick={(event) => {
        if (event.target === event.currentTarget) onDismiss();
      }}
      onKeyDown={(event) => {
        if (event.key !== 'Escape') return;
        event.preventDefault();
        event.stopPropagation();
        onDismiss();
      }}
    >
      <div className="tend-move__card">
        {compact ? <span className="tend-move__grabber" aria-hidden="true" /> : null}
        <div className="tend-move__header">
          <div className="tend-move__heading">
            <p className="tend-move__label">Duplicate to...</p>
            <h2 id={titleId} className="tend-move__title">
              {item.label}
            </h2>
            {focusTitle ? (
              <p id={metaId} className="tend-move__meta">
                {focusTitle}
              </p>
            ) : null}
          </div>
          <button type="button" className="tend-icon-button" aria-label="Close" onClick={onDismiss}>
            ×
          </button>
        </div>

        <div className="tend-move__section">
          <p className="tend-move__label" id={dayLabelId}>
            Days · Pick any
          </p>
          <div className="tend-day-options" role="group" aria-labelledby={dayLabelId}>
            {DAYS.map((day) => {
              const stamp = emailDayStamp(day, weekStart);
              const selected = days.includes(day);
              return (
                <DayOption
                  key={day}
                  buttonRef={day === 'Mon' ? firstDayRef : undefined}
                  name={day}
                  meta={String(stamp.date)}
                  label={emailDayHeading(day, weekStart)}
                  pressed={selected}
                  onSelect={() => toggleDay(day)}
                />
              );
            })}
          </div>
          <button
            type="button"
            className="tend-move__unscheduled"
            aria-pressed={unscheduled}
            onClick={() => setUnscheduled((current) => !current)}
          >
            Unscheduled
          </button>
          {item.day ? null : (
            <p className="tend-move__note">{item.label} needs a day before it can be duplicated.</p>
          )}
          {item.day && days.length === 0 ? (
            <p className="tend-move__note">Pick a day to choose a time.</p>
          ) : null}
          {item.day && days.length === 0 && !unscheduled ? (
            <p className="tend-move__note">Pick one or more days.</p>
          ) : null}
          {item.day && days.length > 0 ? (
            <>
              <p className="tend-move__label" id={timeLabelId}>
                Time
              </p>
              <div className="tend-move__times" role="group" aria-labelledby={timeLabelId}>
              {TIMES.map(({ daypart: option, label }) => (
                <button
                  key={label}
                  type="button"
                  className="tend-move__time"
                  aria-pressed={daypart === option}
                  onClick={() => setDaypart(option)}
                >
                  {label}
                </button>
              ))}
              </div>
            </>
          ) : null}
          {notice ? <p className="tend-move__status">{notice}</p> : null}
        </div>

        <div className="tend-move__footer">
          <button
            type="button"
            className="tend-button-primary tend-move__done"
            disabled={!canCopy}
            onClick={() => onAdd(slots())}
          >
            {addLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}

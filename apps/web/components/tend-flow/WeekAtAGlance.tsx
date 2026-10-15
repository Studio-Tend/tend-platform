'use client';

import { createContext, useCallback, useContext, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import type { Day, Focus, RoomItem } from '@tend/core';
import { useMediaQuery } from '@/lib/use-media-query';
import { DayOption } from './DayOption';
import { glanceSummary, weekGlance, type GlanceDay, type GlancePlan, type WeekGlanceModel } from './week-glance';

/** Matches the narrow planner layout in `tend-flow.css`. */
const COMPACT_VIEWPORT = '(max-width: 760px)';

export function useActivePlanDay() {
  const [active, setActive] = useState<{ sourceId: string; day: Day } | null>(null);
  const onActiveDayChange = useCallback((day: Day | null, sourceId: string) => {
    setActive((current) => {
      if (day === null) return current?.sourceId === sourceId ? null : current;
      if (current?.sourceId === sourceId && current.day === day) return current;
      return { sourceId, day };
    });
  }, []);
  return { activeDay: active?.day ?? null, onActiveDayChange };
}

interface WeekAtAGlanceProps {
  focuses: Focus[];
  roomItems: RoomItem[];
  activeDay?: Day | null;
  children: ReactNode;
}

const GlancePlaceContext = createContext<ReactNode>(null);

/** Where steps 3 and 4 drop the week card, on a wide screen and a narrow one. */
export function WeekGlancePlace() {
  return useContext(GlancePlaceContext);
}

/**
 * Monday–Sunday overview of the live plan. One card in the reading column.
 * It does not keep its own copy of the schedule.
 */
export function WeekAtAGlance({ focuses, roomItems, activeDay = null, children }: WeekAtAGlanceProps) {
  const compact = useMediaQuery(COMPACT_VIEWPORT);
  const glance = weekGlance(focuses, roomItems);
  const headingId = useId();

  return (
    <GlancePlaceContext.Provider
      value={<GlanceCard glance={glance} activeDay={activeDay} headingId={headingId} compact={compact} />}
    >
      <div className="tend-flow__column">{children}</div>
    </GlancePlaceContext.Provider>
  );
}

function firstPlannedDay(glance: WeekGlanceModel, activeDay: Day | null): Day {
  if (activeDay) return activeDay;
  return glance.days.find((day) => !day.empty)?.day ?? 'Mon';
}

function GlanceCard({
  glance,
  activeDay,
  headingId,
  compact,
}: {
  glance: WeekGlanceModel;
  activeDay: Day | null;
  headingId: string;
  compact: boolean;
}) {
  const [open, setOpen] = useState(false);
  const tuned = useRef(false);
  const [selected, setSelected] = useState<Day>(() => firstPlannedDay(glance, activeDay));
  const [seenActive, setSeenActive] = useState(activeDay);
  if (activeDay !== seenActive) {
    setSeenActive(activeDay);
    if (activeDay) setSelected(activeDay);
  }
  const panelId = useId();
  const summary = glanceSummary(glance);
  const day = glance.days.find((item) => item.day === selected) ?? glance.days[0]!;
  const plans = day.groups.flatMap((group) => group.plans);

  useEffect(() => {
    if (tuned.current) return;
    tuned.current = true;
    setOpen(!compact);
  }, [compact]);

  const toggle = () => setOpen((current) => !current);

  return (
    <div className="tend-glance-pin">
      <section className="tend-glance-card" aria-labelledby={headingId}>
        <div className="tend-glance-card__header" onClick={toggle}>
          <div className="tend-glance-card__row">
            <h2 id={headingId} className="tend-glance-card__title">
              Your week at a glance
            </h2>
            <button
              type="button"
              className="tend-glance-card__toggle"
              aria-expanded={open}
              aria-controls={panelId}
              onClick={(event) => {
                event.stopPropagation();
                toggle();
              }}
            >
              {open ? 'Hide' : 'Show'}
              <ChevronIcon open={open} />
            </button>
          </div>
          {summary && <p className="tend-glance-card__summary">{summary}</p>}
        </div>
        <div id={panelId} className="tend-glance-card__panel" hidden={!open}>
          {open && (
            <>
              <div className="tend-day-options" role="group" aria-label="Days">
                {glance.days.map((item) => (
                  <GlanceDayButton
                    key={item.day}
                    day={item}
                    pressed={item.day === day.day}
                    onSelect={() => setSelected(item.day)}
                  />
                ))}
              </div>
              <GlanceDayDetail day={day} plans={plans} />
            </>
          )}
        </div>
      </section>
    </div>
  );
}

function dayItemCount(day: GlanceDay): number {
  return day.groups.reduce((sum, group) => sum + group.plans.length, 0);
}

function GlanceDayButton({ day, pressed, onSelect }: { day: GlanceDay; pressed: boolean; onSelect: () => void }) {
  const count = dayItemCount(day);
  const countLabel = count === 0 ? 'nothing planned' : count === 1 ? '1 item' : `${count} items`;
  return (
    <DayOption
      name={day.day}
      meta={String(count)}
      label={`${day.day}, ${countLabel}`}
      pressed={pressed}
      onSelect={onSelect}
    />
  );
}

function GlanceDayDetail({ day, plans }: { day: GlanceDay; plans: GlancePlan[] }) {
  return (
    <div className="tend-glance-detail">
      <h3 className="tend-glance-detail__title">{day.title}</h3>
      {plans.length === 0 ? (
        <p className="tend-glance-detail__empty">Nothing planned for this day.</p>
      ) : (
        <ul className="tend-glance-detail__plans">
          {plans.map((plan) => (
            <GlancePlanRow key={plan.key} plan={plan} />
          ))}
        </ul>
      )}
    </div>
  );
}

function GlancePlanRow({ plan }: { plan: GlancePlan }) {
  const cue = plan.focusTitle ?? 'Make room';
  return (
    <li className="tend-glance-detail__plan">
      {plan.colorIndex === null ? (
        <span className="tend-room-marker" aria-hidden="true">
          ✦
        </span>
      ) : (
        <span className="tend-focus-dot" data-focus-color={plan.colorIndex} aria-hidden="true" />
      )}
      <span className="tend-glance-detail__label">
        {plan.label}
        {plan.daypart ? <span className="tend-glance-detail__when"> · {plan.daypart}</span> : null}
        <span className="tend-sr-only">, {cue}</span>
      </span>
    </li>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      className={`tend-glance-card__chevron${open ? ' tend-glance-card__chevron--open' : ''}`}
      viewBox="0 0 16 16"
      width="16"
      height="16"
      aria-hidden="true"
    >
      <path
        d="M4 6.5 8 10.5 12 6.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

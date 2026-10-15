import type { Ref } from 'react';

/**
 * One weekday in a seven-day row. The scheduling sheet and the week glance
 * share it so selected, hover, focus, and touch-target treatment stay the same.
 */
export function DayOption({
  name,
  meta,
  label,
  pressed,
  onSelect,
  buttonRef,
}: {
  name: string;
  meta: string;
  /** Full accessible name, including the selected meaning. */
  label: string;
  pressed: boolean;
  onSelect: () => void;
  buttonRef?: Ref<HTMLButtonElement>;
}) {
  return (
    <button
      ref={buttonRef}
      type="button"
      className="tend-day-option"
      aria-pressed={pressed}
      aria-label={label}
      onClick={onSelect}
    >
      <span className="tend-day-option__name" aria-hidden="true">
        {name}
      </span>
      <span className="tend-day-option__meta" aria-hidden="true">
        {meta}
      </span>
    </button>
  );
}

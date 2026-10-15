'use client';

import { useEffect, useRef, useState } from 'react';

export const UNDO_TOAST_MS = 6000;

interface UndoToastProps {
  message: string;
  undoLabel?: string;
  onUndo: () => void;
  onDismiss: () => void;
}

/**
 * One undo toast at a time. The parent remounts it (via `key`) to replace an
 * in-flight toast instead of stacking, and announces the message itself: a
 * live region that enters the page already holding its text is not read out
 * reliably, so this is a plain element.
 *
 * Undo is focused when the toast appears so a keyboard delete can be reversed
 * without tabbing the board. That programmatic focus must not hold the
 * countdown — otherwise the toast would stay until the next click. Hover and
 * a later user focus still hold independently.
 */
export function UndoToast({ message, undoLabel = 'Undo', onUndo, onDismiss }: UndoToastProps) {
  const [hovering, setHovering] = useState(false);
  const [focusInside, setFocusInside] = useState(false);
  const remainingMs = useRef(UNDO_TOAST_MS);
  const onDismissRef = useRef(onDismiss);
  const undoRef = useRef<HTMLButtonElement>(null);
  const programmaticFocus = useRef(false);

  useEffect(() => {
    onDismissRef.current = onDismiss;
  }, [onDismiss]);

  useEffect(() => {
    programmaticFocus.current = true;
    undoRef.current?.focus({ preventScroll: true });
    programmaticFocus.current = false;
  }, []);

  const held = hovering || focusInside;

  useEffect(() => {
    if (held) return;
    const startedAt = Date.now();
    const id = window.setTimeout(() => onDismissRef.current(), remainingMs.current);
    return () => {
      window.clearTimeout(id);
      remainingMs.current = Math.max(0, remainingMs.current - (Date.now() - startedAt));
    };
  }, [held]);

  return (
    <div
      className="tend-undo-toast"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      onFocusCapture={() => {
        if (programmaticFocus.current) return;
        setFocusInside(true);
      }}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocusInside(false);
      }}
    >
      <p className="tend-undo-toast__message">{message}</p>
      <button ref={undoRef} type="button" className="tend-undo-toast__undo" onClick={onUndo}>
        {undoLabel}
      </button>
    </div>
  );
}

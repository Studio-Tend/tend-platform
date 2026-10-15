'use client';

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';

/**
 * Pointer dragging, not the HTML drag-and-drop API: that API misses most
 * touchscreens, and these lists are used on phones. The handle is the only
 * drag surface so editing, checking, and removing a row stay ordinary taps.
 */
const DRAG_SLOP = 4;

type DragOrigin = { scope: string; id: string; y: number; pointerId: number; dragging: boolean };
type DragTarget = { scope: string; id: string };

export function useReorderDrag(onDrop: (scope: string, fromId: string, toId: string) => void) {
  const onDropRef = useRef(onDrop);
  // Copy after commit. Assigning during render keeps a callback from a render
  // React discarded, and react-hooks/refs rejects it.
  useEffect(() => {
    onDropRef.current = onDrop;
  }, [onDrop]);
  const origin = useRef<DragOrigin | null>(null);
  const overRef = useRef<DragTarget | null>(null);
  const detachListeners = useRef<(() => void) | null>(null);
  const [active, setActive] = useState<DragTarget | null>(null);
  const [over, setOver] = useState<DragTarget | null>(null);
  const [announcement, setAnnouncement] = useState('');

  const rememberOver = (next: DragTarget | null) => {
    overRef.current = next;
    setOver((current) => {
      if (current?.scope === next?.scope && current?.id === next?.id) return current;
      if (!current && !next) return current;
      return next;
    });
  };

  const endGesture = () => {
    detachListeners.current?.();
    detachListeners.current = null;
    document.documentElement.classList.remove('tend-reordering');
  };

  // A step can unmount while the pointer is still down. The window listeners
  // would otherwise finish the drag against a tree that is already gone.
  useEffect(() => {
    return () => {
      detachListeners.current?.();
      detachListeners.current = null;
      document.documentElement.classList.remove('tend-reordering');
      origin.current = null;
    };
  }, []);

  const finish = () => {
    const drag = origin.current;
    const target = overRef.current;
    origin.current = null;
    endGesture();
    rememberOver(null);
    setActive(null);
    if (drag?.dragging && target && target.scope === drag.scope && target.id !== drag.id) {
      onDropRef.current(drag.scope, drag.id, target.id);
    }
  };

  const rowProps = (scope: string, id: string) => ({
    'data-reorder-scope': scope,
    'data-reorder-id': id,
  });

  const rowClass = (base: string, scope: string, id: string) =>
    [
      base,
      active?.scope === scope && active.id === id ? 'tend-reorder--dragging' : '',
      over?.scope === scope && over.id === id ? 'tend-reorder--over' : '',
    ]
      .filter(Boolean)
      .join(' ');

  const handleProps = (scope: string, id: string) => ({
    onPointerDown: (event: ReactPointerEvent<HTMLButtonElement>) => {
      if (event.button !== 0) return;
      // A second pointer must not stack another set of window listeners, or
      // finish a drag it did not start.
      if (origin.current) return;
      const pointerId = event.pointerId;
      origin.current = { scope, id, y: event.clientY, pointerId, dragging: false };
      // Listen on the window so the drag continues after the pointer leaves the
      // handle. Pointer capture is unreliable across browsers and test drivers.
      const move = (pointer: PointerEvent) => {
        if (pointer.pointerId !== pointerId) return;
        const drag = origin.current;
        if (!drag || drag.id !== id || drag.scope !== scope) return;
        if (!drag.dragging) {
          if (Math.abs(pointer.clientY - drag.y) < DRAG_SLOP) return;
          drag.dragging = true;
          setActive({ scope, id });
          document.documentElement.classList.add('tend-reordering');
        }
        const nextId = rowIdAt(pointer.clientX, pointer.clientY, scope);
        // Release follows the row under the pointer. A gap or the row that was
        // picked up is not a drop target, even if another row was hovered earlier.
        if (!nextId || nextId === id) {
          rememberOver(null);
          return;
        }
        if (overRef.current?.scope === scope && overRef.current.id === nextId) return;
        rememberOver({ scope, id: nextId });
      };
      const up = (pointer: PointerEvent) => {
        if (pointer.pointerId !== pointerId) return;
        finish();
      };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
      window.addEventListener('pointercancel', up);
      detachListeners.current = () => {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
        window.removeEventListener('pointercancel', up);
      };
    },
  });

  return {
    rowProps,
    rowClass,
    handleProps,
    isDragging: (scope: string, id: string) => active?.scope === scope && active.id === id,
    announcement,
    announce: (message: string) => setAnnouncement(message),
  };
}

function rowIdAt(x: number, y: number, scope: string): string | null {
  let el = document.elementFromPoint(x, y);
  while (el) {
    if (el instanceof HTMLElement && el.dataset.reorderScope === scope) {
      return el.dataset.reorderId ?? null;
    }
    el = el.parentElement;
  }
  return null;
}

export function ReorderStatus({ message }: { message: string }) {
  return (
    <div className="tend-sr-only" role="status" aria-live="polite">
      {message}
    </div>
  );
}

export function ReorderHandle({
  label,
  index,
  count,
  dragging,
  onKeyMove,
  announce,
  ...pointer
}: {
  label: string;
  index: number;
  count: number;
  dragging: boolean;
  onKeyMove: (delta: -1 | 1) => void;
  announce: (message: string) => void;
} & ReturnType<ReturnType<typeof useReorderDrag>['handleProps']>) {
  return (
    <button
      type="button"
      className={`tend-icon-button tend-drag-handle${dragging ? ' tend-drag-handle--dragging' : ''}`}
      aria-label={`Reorder ${label}, ${index + 1} of ${count}. Arrow up and arrow down move it.`}
      onKeyDown={(event) => {
        if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
        event.preventDefault();
        const delta = event.key === 'ArrowUp' ? -1 : 1;
        const next = index + delta;
        if (next < 0 || next >= count) return;
        onKeyMove(delta);
        announce(`Moved ${label} to position ${next + 1} of ${count}`);
      }}
      {...pointer}
    >
      <GripIcon />
    </button>
  );
}

function GripIcon() {
  return (
    <svg viewBox="0 0 16 16" width="1em" height="1em" aria-hidden="true">
      <circle cx="6" cy="4" r="1.15" fill="currentColor" />
      <circle cx="10" cy="4" r="1.15" fill="currentColor" />
      <circle cx="6" cy="8" r="1.15" fill="currentColor" />
      <circle cx="10" cy="8" r="1.15" fill="currentColor" />
      <circle cx="6" cy="12" r="1.15" fill="currentColor" />
      <circle cx="10" cy="12" r="1.15" fill="currentColor" />
    </svg>
  );
}

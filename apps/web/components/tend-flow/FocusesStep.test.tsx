import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { EXTRA_FOCUS_MESSAGES, FOCUS_CAP_MESSAGE, FocusesStep } from './FocusesStep';
import type { Focus } from '@tend/core';

afterEach(() => {
  vi.restoreAllMocks();
});

function Harness({ initial = [] }: { initial?: Focus[] }) {
  const [focuses, setFocuses] = useState<Focus[]>(initial);
  return <FocusesStep focuses={focuses} onChange={setFocuses} onContinue={() => {}} />;
}

function focusesNamed(...titles: string[]): Focus[] {
  return titles.map((title, index) => ({ id: String(index + 1), title, actions: [] }));
}

function editTitles() {
  return screen.getAllByRole('button', { name: /^Edit / }).map((button) => button.textContent);
}

function focusNote() {
  const note = document.querySelector('.tend-flow__focus-note');
  if (!(note instanceof HTMLElement)) throw new Error('missing focus note');
  return note;
}

function rowOf(name: string) {
  const row = screen.getByRole('button', { name }).closest('[data-reorder-id]');
  if (!(row instanceof HTMLElement)) throw new Error(`missing row for ${name}`);
  return row;
}

function withHitTest(hit: (x: number, y: number) => Element | null, run: () => void) {
  const previous = document.elementFromPoint;
  document.elementFromPoint = hit;
  try {
    run();
  } finally {
    document.elementFromPoint = previous;
  }
}

async function addFocus(user: ReturnType<typeof userEvent.setup>, title: string) {
  await user.type(screen.getByLabelText('Add a focus'), title);
  await user.click(screen.getByRole('button', { name: 'Add' }));
}

describe('FocusesStep', () => {
  it('reserves the note slot before any message appears', () => {
    render(<Harness />);
    expect(focusNote()).toBeEmptyDOMElement();
  });

  it('shows a playful note when the fourth focus is added', async () => {
    const user = userEvent.setup();
    vi.spyOn(Math, 'random').mockReturnValue(0);

    render(<Harness initial={focusesNamed('One', 'Two', 'Three')} />);
    await addFocus(user, 'Four');

    expect(screen.getByText('Four')).toBeInTheDocument();
    expect(focusNote()).toHaveTextContent(EXTRA_FOCUS_MESSAGES[0]);
  });

  it('lets the user add a sixth focus, then disables Add', async () => {
    const user = userEvent.setup();

    render(<Harness initial={focusesNamed('One', 'Two', 'Three', 'Four', 'Five')} />);
    expect(screen.getByRole('button', { name: 'Add' })).toBeEnabled();
    await addFocus(user, 'Six');

    expect(screen.getByText('Six')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add' })).toBeDisabled();
    expect(focusNote()).toHaveTextContent(FOCUS_CAP_MESSAGE);
  });

  it('reorders focuses by dragging one onto another', () => {
    render(<Harness initial={focusesNamed('One', 'Two', 'Three')} />);
    const handle = screen.getByRole('button', { name: /Reorder Three/ });
    // A child of the row, so the hit test has to walk up to the reorder target.
    const one = screen.getByRole('button', { name: 'Edit One' });
    withHitTest(
      () => one,
      () => {
        fireEvent.pointerDown(handle, { button: 0, pointerId: 1, clientY: 0 });
        fireEvent.pointerMove(handle, { pointerId: 1, clientX: 0, clientY: 3 });
        fireEvent.pointerUp(handle, { pointerId: 1 });
        expect(editTitles()).toEqual(['One', 'Two', 'Three']);
        expect(document.documentElement).not.toHaveClass('tend-reordering');

        fireEvent.pointerDown(handle, { button: 0, pointerId: 1, clientY: 0 });
        fireEvent.pointerMove(handle, { pointerId: 1, clientX: 0, clientY: 4 });
        expect(document.documentElement).toHaveClass('tend-reordering');
        fireEvent.pointerUp(handle, { pointerId: 1 });
      },
    );

    expect(editTitles()).toEqual(['Three', 'One', 'Two']);
    expect(document.documentElement).not.toHaveClass('tend-reordering');
  });

  it('does not reorder when the pointer returns to the dragged row or leaves the list', () => {
    render(<Harness initial={focusesNamed('One', 'Two', 'Three')} />);
    const handle = screen.getByRole('button', { name: /Reorder Three/ });
    const three = rowOf('Edit Three');
    const one = rowOf('Edit One');
    withHitTest(
      (_x, y) => (y >= 200 ? document.body : y >= 40 ? one : three),
      () => {
        fireEvent.pointerDown(handle, { button: 0, pointerId: 1, clientY: 0 });
        fireEvent.pointerMove(handle, { pointerId: 1, clientX: 0, clientY: 40 });
        expect(one).toHaveClass('tend-reorder--over');
        fireEvent.pointerMove(handle, { pointerId: 1, clientX: 0, clientY: 8 });
        expect(one).not.toHaveClass('tend-reorder--over');
        fireEvent.pointerUp(handle, { pointerId: 1 });
        expect(editTitles()).toEqual(['One', 'Two', 'Three']);

        fireEvent.pointerDown(handle, { button: 0, pointerId: 1, clientY: 0 });
        fireEvent.pointerMove(handle, { pointerId: 1, clientX: 0, clientY: 40 });
        fireEvent.pointerMove(handle, { pointerId: 1, clientX: 0, clientY: 200 });
        expect(one).not.toHaveClass('tend-reorder--over');
        fireEvent.pointerUp(handle, { pointerId: 1 });
      },
    );

    expect(editTitles()).toEqual(['One', 'Two', 'Three']);
  });

  it('ignores a second pointer and drops the listeners if the step unmounts', () => {
    const onChange = vi.fn();
    const { unmount } = render(
      <FocusesStep focuses={focusesNamed('One', 'Two', 'Three')} onChange={onChange} onContinue={() => {}} />,
    );
    const handle = screen.getByRole('button', { name: /Reorder Three/ });
    const one = rowOf('Edit One');
    withHitTest(
      () => one,
      () => {
        fireEvent.pointerDown(handle, { button: 0, pointerId: 1, clientY: 0 });
        fireEvent.pointerMove(handle, { pointerId: 1, clientX: 0, clientY: 20 });
        fireEvent.pointerDown(handle, { button: 0, pointerId: 2, clientY: 0 });
        fireEvent.pointerUp(handle, { pointerId: 2 });
        expect(editTitles()).toEqual(['One', 'Two', 'Three']);
        expect(onChange).not.toHaveBeenCalled();

        unmount();
        window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1, bubbles: true }));
      },
    );

    expect(onChange).not.toHaveBeenCalled();
    expect(document.documentElement).not.toHaveClass('tend-reordering');
  });

  it('moves a focus up with the arrow key and announces the new position', async () => {
    const user = userEvent.setup();
    render(<Harness initial={focusesNamed('One', 'Two')} />);

    const handle = screen.getByRole('button', { name: /Reorder Two/ });
    expect(handle).toHaveAccessibleName(/Arrow up and arrow down move it/);
    handle.focus();
    await user.keyboard('{ArrowUp}');

    expect(editTitles()).toEqual(['Two', 'One']);
    expect(screen.getByRole('button', { name: /Reorder Two/ })).toHaveFocus();
    expect(screen.getByText('Moved Two to position 1 of 2')).toHaveAttribute('role', 'status');
  });

  it('does not add a seventh focus and asks if one could wait', async () => {
    const user = userEvent.setup();

    render(<Harness initial={focusesNamed('One', 'Two', 'Three', 'Four', 'Five', 'Six')} />);

    expect(screen.getByRole('button', { name: 'Add' })).toBeDisabled();
    expect(focusNote()).toHaveTextContent(FOCUS_CAP_MESSAGE);

    await user.type(screen.getByLabelText('Add a focus'), 'Seven{Enter}');

    expect(screen.queryByText('Seven')).not.toBeInTheDocument();
  });
});

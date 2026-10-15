import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { UNDO_TOAST_MS, UndoToast } from './UndoToast';

const MESSAGE = 'Study removed';

/** The toast is not a live region, so reach it through its message. */
const toast = () => screen.getByText(MESSAGE).closest('.tend-undo-toast') as HTMLElement;

const undo = () => screen.getByRole('button', { name: 'Undo' });

/** Hold and release are state changes, so they have to be flushed. */
const focus = (element: HTMLElement) => act(() => element.focus());
const blur = (element: HTMLElement) => act(() => element.blur());

describe('UndoToast', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('dismisses after the timer', () => {
    vi.useFakeTimers();
    const onDismiss = vi.fn();
    render(<UndoToast message={MESSAGE} onUndo={() => undefined} onDismiss={onDismiss} />);

    vi.advanceTimersByTime(UNDO_TOAST_MS - 1);
    expect(onDismiss).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('pauses the timer while hovered and resumes with the time left', () => {
    vi.useFakeTimers();
    const onDismiss = vi.fn();
    render(<UndoToast message={MESSAGE} onUndo={() => undefined} onDismiss={onDismiss} />);

    vi.advanceTimersByTime(2000);
    fireEvent.mouseEnter(toast());
    vi.advanceTimersByTime(UNDO_TOAST_MS);
    expect(onDismiss).not.toHaveBeenCalled();

    fireEvent.mouseLeave(toast());
    vi.advanceTimersByTime(UNDO_TOAST_MS - 2000 - 1);
    expect(onDismiss).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('focuses Undo when it appears without holding the countdown', () => {
    vi.useFakeTimers();
    const onDismiss = vi.fn();
    render(<UndoToast message={MESSAGE} onUndo={() => undefined} onDismiss={onDismiss} />);

    expect(undo()).toHaveFocus();
    vi.advanceTimersByTime(UNDO_TOAST_MS);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('pauses the timer while Undo is focused', () => {
    vi.useFakeTimers();
    const onDismiss = vi.fn();
    render(<UndoToast message={MESSAGE} onUndo={() => undefined} onDismiss={onDismiss} />);

    // Mount already focused Undo without holding. A later user focus must hold.
    blur(undo());
    focus(undo());
    vi.advanceTimersByTime(UNDO_TOAST_MS);
    expect(onDismiss).not.toHaveBeenCalled();

    blur(undo());
    vi.advanceTimersByTime(UNDO_TOAST_MS);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  // Hover and focus each hold the countdown on their own. A single flag would
  // let the first one to end restart the timer, and the toast would disappear
  // out from under the other.
  it('keeps holding when the pointer leaves while Undo still has focus', () => {
    vi.useFakeTimers();
    const onDismiss = vi.fn();
    render(<UndoToast message={MESSAGE} onUndo={() => undefined} onDismiss={onDismiss} />);

    fireEvent.mouseEnter(toast());
    blur(undo());
    focus(undo());
    fireEvent.mouseLeave(toast());

    vi.advanceTimersByTime(UNDO_TOAST_MS * 2);
    expect(onDismiss).not.toHaveBeenCalled();

    blur(undo());
    vi.advanceTimersByTime(UNDO_TOAST_MS);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('keeps holding when focus leaves while the pointer is still over it', () => {
    vi.useFakeTimers();
    const onDismiss = vi.fn();
    render(
      <>
        <UndoToast message={MESSAGE} onUndo={() => undefined} onDismiss={onDismiss} />
        <button type="button">Elsewhere</button>
      </>,
    );

    blur(undo());
    focus(undo());
    fireEvent.mouseEnter(toast());
    focus(screen.getByRole('button', { name: 'Elsewhere' }));

    vi.advanceTimersByTime(UNDO_TOAST_MS * 2);
    expect(onDismiss).not.toHaveBeenCalled();

    fireEvent.mouseLeave(toast());
    vi.advanceTimersByTime(UNDO_TOAST_MS);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('does not dismiss immediately when hovered before the timer starts', () => {
    vi.useFakeTimers({ now: 1_700_000_000_000 });
    const onDismiss = vi.fn();
    render(<UndoToast message={MESSAGE} onUndo={() => undefined} onDismiss={onDismiss} />);

    fireEvent.mouseEnter(toast());
    vi.advanceTimersByTime(0);
    expect(onDismiss).not.toHaveBeenCalled();

    fireEvent.mouseLeave(toast());
    vi.advanceTimersByTime(UNDO_TOAST_MS);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('runs Undo immediately without waiting for the timer', () => {
    vi.useFakeTimers();
    const onUndo = vi.fn();
    const onDismiss = vi.fn();
    render(<UndoToast message={MESSAGE} onUndo={onUndo} onDismiss={onDismiss} />);

    fireEvent.click(undo());

    expect(onUndo).toHaveBeenCalledTimes(1);
    expect(onDismiss).not.toHaveBeenCalled();
  });
});

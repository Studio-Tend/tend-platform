import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { Focus, RoomItem } from '@tend/core';
import { ActionsStep } from './ActionsStep';
import { MakeRoomStep } from './MakeRoomStep';
import { PrioritizeStep } from './PrioritizeStep';

const focus = (id: string, title: string, actions: string[]): Focus => ({
  id,
  title,
  actions: actions.map((label) => ({ id: `${id}-${label}`, label, checked: false, slots: [] })),
});

function editLabels() {
  return screen.getAllByRole('button', { name: /^Edit / }).map((button) => button.textContent);
}

function ActionsHarness() {
  const [actions, setActions] = useState(focus('job', 'Work', ['Call', 'Write']).actions);
  return (
    <ActionsStep
      focus={{ id: 'job', title: 'Work', actions }}
      focusIndex={0}
      totalFocuses={1}
      onChangeActions={(update) => setActions((current) => update(current))}
      onBack={() => undefined}
      onContinue={() => undefined}
    />
  );
}

function PrioritizeHarness() {
  const [focuses, setFocuses] = useState<Focus[]>([
    focus('job', 'Work', ['Call', 'Write']),
    focus('home', 'Home', ['Cook']),
  ]);
  return (
    <PrioritizeStep
      focuses={focuses}
      roomItems={[]}
      onChange={setFocuses}
      onRoomItemsChange={() => undefined}
      onBack={() => undefined}
      onContinue={() => undefined}
    />
  );
}

function MakeRoomHarness() {
  const [items, setItems] = useState<RoomItem[]>([
    { id: 'walk', label: 'Beach walk', slots: [] },
    { id: 'dinner', label: 'Dinner', slots: [] },
  ]);
  return (
    <MakeRoomStep
      focuses={[]}
      items={items}
      onChange={setItems}
      onFocusesChange={() => undefined}
      onBack={() => undefined}
      onContinue={() => undefined}
    />
  );
}

describe('list reorder', () => {
  it('moves an action down with the arrow key on the brainstorm step', async () => {
    const user = userEvent.setup();
    render(<ActionsHarness />);

    screen.getByRole('button', { name: /Reorder Call/ }).focus();
    await user.keyboard('{ArrowDown}');

    expect(editLabels()).toEqual(['Write', 'Call']);
    expect(screen.getByRole('button', { name: /Reorder Call/ })).toHaveFocus();
    expect(screen.getByText('Moved Call to position 2 of 2')).toHaveAttribute('role', 'status');
  });

  it('reorders actions inside a focus and focuses themselves on the prioritize step', async () => {
    const user = userEvent.setup();
    render(<PrioritizeHarness />);

    const call = screen.getByRole('button', { name: /Reorder Call/ });
    expect(call).toHaveAccessibleName(/Arrow up and arrow down move it/);
    call.focus();
    await user.keyboard('{ArrowDown}');
    expect(editLabels()).toEqual(['Work', 'Write', 'Call', 'Home', 'Cook']);
    expect(screen.getByRole('button', { name: /Reorder Call/ })).toHaveFocus();
    expect(screen.getByText('Moved Call to position 2 of 2')).toHaveAttribute('role', 'status');

    const work = screen.getByRole('button', { name: /Reorder Work/ });
    work.focus();
    await user.keyboard('{ArrowDown}');
    expect(editLabels()).toEqual(['Home', 'Cook', 'Work', 'Write', 'Call']);
    expect(screen.getByRole('button', { name: /Reorder Work/ })).toHaveFocus();
    expect(screen.getByText('Moved Work to position 2 of 2')).toHaveAttribute('role', 'status');
  });

  it('keeps the schedule in the label column, after the checkbox', async () => {
    const user = userEvent.setup();
    render(<PrioritizeHarness />);

    for (const name of ['Choose Call', 'Choose Cook']) {
      await user.click(screen.getByRole('checkbox', { name }));
      const checkbox = screen.getByRole('checkbox', { name });
      const stack = checkbox.closest('.tend-check')?.nextElementSibling;
      const scheduler = stack instanceof HTMLElement ? stack.querySelector('.tend-scheduler') : null;
      expect(stack).toHaveClass('tend-action-row__stack');
      expect(scheduler).toBeInstanceOf(HTMLElement);
      expect(checkbox.closest('.tend-action-row__stack')).toBeNull();
    }
  });

  it('moves a make-room item up with the arrow key', async () => {
    const user = userEvent.setup();
    render(<MakeRoomHarness />);

    screen.getByRole('button', { name: /Reorder Dinner/ }).focus();
    await user.keyboard('{ArrowUp}');

    expect(editLabels()).toEqual(['Dinner', 'Beach walk']);
    expect(screen.getByRole('button', { name: /Reorder Dinner/ })).toHaveFocus();
    expect(screen.getByText('Moved Dinner to position 1 of 2')).toHaveAttribute('role', 'status');
  });
});

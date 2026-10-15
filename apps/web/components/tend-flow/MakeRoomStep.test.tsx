import { useState } from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { Focus, RoomItem } from '@tend/core';
import { MakeRoomStep } from './MakeRoomStep';

const focuses: Focus[] = [
  {
    id: 'job',
    title: 'Work',
    actions: [
      { id: 'study', label: 'Study', checked: true, slots: [{ day: 'Wed', dayparts: ['Morning'] }] },
      { id: 'later', label: 'Later', checked: false, slots: [{ day: 'Tue', dayparts: ['Evening'] }] },
    ],
  },
];

const roomItems: RoomItem[] = [
  { id: 'walk', label: 'Beach walk', slots: [{ day: 'Fri', dayparts: ['Afternoon'] }] },
  { id: 'read', label: 'Read', slots: [] },
];

function Harness() {
  const [goals, setGoals] = useState(focuses);
  const [items, setItems] = useState(roomItems);
  return (
    <MakeRoomStep
      focuses={goals}
      items={items}
      onChange={setItems}
      onFocusesChange={setGoals}
      onBack={() => undefined}
      onContinue={() => undefined}
    />
  );
}

describe('MakeRoomStep day dots', () => {
  it('marks days that already have something scheduled', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole('button', { name: '+ Add a time' }));

    expect(screen.getByRole('button', { name: 'Wed, something scheduled' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Fri, something scheduled' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mon' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tue' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Mon' }));

    expect(screen.getByRole('button', { name: 'Mon, something scheduled' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('shows a planned action and takes that time off without leaving the step', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole('button', { name: '+ Add a time' }));
    await user.click(screen.getByRole('button', { name: 'Wed, something scheduled' }));
    await user.click(screen.getByRole('button', { name: 'Morning' }));

    expect(screen.getByText('Already planned for Wednesday')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Unschedule Study' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Unschedule Study' }));

    expect(screen.queryByText('Already planned for Wednesday')).not.toBeInTheDocument();
  });
});

describe('MakeRoomStep intention', () => {
  it('saves one choice and shows it beside the time', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getAllByRole('button', { name: '+ Add intention' })[0]!);
    const dialog = screen.getByRole('dialog', { name: 'What would this bring into your life?' });
    expect(dialog).toHaveTextContent('Beach walk');

    await user.click(within(dialog).getByRole('button', { name: 'Connection' }));
    expect(within(dialog).getByRole('button', { name: 'Connection' })).toHaveAttribute('aria-pressed', 'true');

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'What would this bring into your life?' })).not.toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: 'Connection ✎' })).toBeInTheDocument();
  });

  it('clears the choice when it is selected again', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getAllByRole('button', { name: '+ Add intention' })[0]!);
    let dialog = screen.getByRole('dialog', { name: 'What would this bring into your life?' });
    await user.click(within(dialog).getByRole('button', { name: 'Connection' }));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Connection ✎' })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Connection ✎' }));
    dialog = screen.getByRole('dialog', { name: 'What would this bring into your life?' });
    await user.click(within(dialog).getByRole('button', { name: 'Connection' }));
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'What would this bring into your life?' })).not.toBeInTheDocument();
    });

    expect(screen.queryByRole('button', { name: 'Connection ✎' })).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: '+ Add intention' })).toHaveLength(2);
  });

  it('saves what was typed under Other, and ignores an empty Other', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getAllByRole('button', { name: '+ Add intention' })[1]!);
    let dialog = screen.getByRole('dialog', { name: 'What would this bring into your life?' });
    await user.click(within(dialog).getByRole('button', { name: 'Other' }));
    expect(within(dialog).getByRole('textbox', { name: 'Your intention' })).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Done' }));
    expect(screen.getAllByRole('button', { name: '+ Add intention' })).toHaveLength(2);

    await user.click(screen.getAllByRole('button', { name: '+ Add intention' })[1]!);
    dialog = screen.getByRole('dialog', { name: 'What would this bring into your life?' });
    await user.click(within(dialog).getByRole('button', { name: 'Other' }));
    await user.type(within(dialog).getByRole('textbox', { name: 'Your intention' }), 'Quiet morning');
    await user.click(within(dialog).getByRole('button', { name: 'Done' }));

    expect(screen.getByRole('button', { name: 'Quiet morning ✎' })).toBeInTheDocument();
  });
});

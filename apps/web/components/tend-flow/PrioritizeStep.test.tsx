import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { Focus, RoomItem } from '@tend/core';
import { PrioritizeStep } from './PrioritizeStep';

const focuses: Focus[] = [
  {
    id: 'job',
    title: 'Work',
    actions: [
      { id: 'study', label: 'Study', checked: true, slots: [{ day: 'Wed', dayparts: ['Morning'] }] },
      { id: 'call', label: 'Call', checked: true, slots: [] },
      { id: 'later', label: 'Later', checked: false, slots: [{ day: 'Tue', dayparts: ['Evening'] }] },
    ],
  },
];

const roomItems: RoomItem[] = [
  { id: 'walk', label: 'Beach walk', slots: [{ day: 'Fri', dayparts: ['Afternoon'] }] },
];

function Harness({
  initialFocuses = focuses,
  initialRoom = roomItems,
}: {
  initialFocuses?: Focus[];
  initialRoom?: RoomItem[];
} = {}) {
  const [current, setCurrent] = useState(initialFocuses);
  const [rooms, setRooms] = useState(initialRoom);
  return (
    <PrioritizeStep
      focuses={current}
      roomItems={rooms}
      onChange={setCurrent}
      onRoomItemsChange={setRooms}
      onBack={() => undefined}
      onContinue={() => undefined}
    />
  );
}

describe('PrioritizeStep goal colors', () => {
  it('uses the same focus dot as the week glance', () => {
    render(
      <Harness
        initialFocuses={[
          { ...focuses[0], colorIndex: 0 },
          { id: 'health', title: 'Health', colorIndex: 1, actions: [] },
        ]}
      />,
    );

    const work = screen.getByRole('button', { name: 'Edit Work' }).closest('.tend-section__identity');
    const health = screen.getByRole('button', { name: 'Edit Health' }).closest('.tend-section__identity');
    expect(work?.querySelector('.tend-focus-dot')).toHaveAttribute('data-focus-color', '0');
    expect(health?.querySelector('.tend-focus-dot')).toHaveAttribute('data-focus-color', '1');
  });
});

describe('PrioritizeStep day dots', () => {
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
});

describe('PrioritizeStep planned times', () => {
  it('shows what is already planned for the selected time', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole('button', { name: '+ Add a time' }));
    await user.click(screen.getByRole('button', { name: 'Wed, something scheduled' }));
    await user.click(screen.getByRole('button', { name: 'Morning' }));

    expect(screen.getByText('Already planned for Wednesday')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Unschedule Study' })).toBeInTheDocument();
    expect(screen.getByText("It's okay to add another action on this day if it feels right.")).toBeInTheDocument();
  });

  it('leaves out the action being scheduled and anything not on the week', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole('button', { name: 'Wed · morning ✎' }));

    expect(screen.queryByText(/Already planned/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Unschedule Study' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Done' }));
    await user.click(screen.getByRole('button', { name: '+ Add a time' }));
    await user.click(screen.getByRole('button', { name: 'Tue' }));
    await user.click(screen.getByRole('button', { name: 'Evening' }));

    expect(screen.queryByText('Already planned for Tuesday')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Unschedule Later' })).not.toBeInTheDocument();
  });

  it('takes only that time off the week and keeps the action selected', async () => {
    const user = userEvent.setup();
    render(
      <Harness
        initialFocuses={[
          {
            id: 'job',
            title: 'Work',
            actions: [
              {
                id: 'lift',
                label: 'Lift',
                checked: true,
                slots: [
                  { day: 'Mon', dayparts: ['Morning'] },
                  { day: 'Wed', dayparts: ['Evening'] },
                ],
              },
              { id: 'call', label: 'Call', checked: true, slots: [] },
            ],
          },
        ]}
        initialRoom={[]}
      />,
    );

    await user.click(screen.getByRole('button', { name: '+ Add a time' }));
    await user.click(screen.getByRole('button', { name: 'Wed, something scheduled' }));
    await user.click(screen.getByRole('button', { name: 'Evening' }));
    await user.click(screen.getByRole('button', { name: 'Unschedule Lift' }));

    expect(screen.queryByText('Already planned for Wednesday')).not.toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Choose Lift' })).toBeChecked();
    expect(screen.getByRole('button', { name: 'Mon · morning ✎' })).toBeInTheDocument();
  });

  it('leaves a last time unscheduled and still selected', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole('button', { name: '+ Add a time' }));
    await user.click(screen.getByRole('button', { name: 'Wed, something scheduled' }));
    await user.click(screen.getByRole('button', { name: 'Morning' }));
    await user.click(screen.getByRole('button', { name: 'Unschedule Study' }));

    expect(screen.queryByText('Already planned for Wednesday')).not.toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Choose Study' })).toBeChecked();
    expect(screen.getByRole('button', { name: '+ Add a time' })).toBeInTheDocument();
  });

  it('takes a make-room item off the selected time', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole('button', { name: '+ Add a time' }));
    await user.click(screen.getByRole('button', { name: 'Fri, something scheduled' }));
    await user.click(screen.getByRole('button', { name: 'Afternoon' }));
    await user.click(screen.getByRole('button', { name: 'Unschedule Beach walk' }));

    expect(screen.queryByText('Already planned for Friday')).not.toBeInTheDocument();
  });
});

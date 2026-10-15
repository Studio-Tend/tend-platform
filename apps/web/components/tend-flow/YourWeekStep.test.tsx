import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Focus, RoomItem } from '@tend/core';
import { upcomingMonday } from '@/lib/calendar/upcoming-monday';
import { emailDayHeading, emailDayStamp } from '@/lib/email/week-layout';
import { UNDO_TOAST_MS } from '@/components/ui/UndoToast';
import { weekEditHint, YourWeekStep } from './YourWeekStep';

const EDIT_HINT = /Drag to move · hold (⌥|Alt) to copy · right-click for more/;

const startingFocuses: Focus[] = [
  {
    id: 'job',
    title: 'Job',
    actions: [
      { id: 'study', label: 'Study', checked: true, slots: [{ day: 'Mon', dayparts: ['Morning'] }] },
      { id: 'run', label: 'Run', checked: true, slots: [{ day: 'Mon', dayparts: ['Morning'] }] },
    ],
  },
];

const startingRoomItems: RoomItem[] = [
  { id: 'scrolling', label: 'Scrolling', slots: [{ day: 'Wed', dayparts: ['Evening'] }] },
];

function focusesWith(slots: Focus['actions'][number]['slots']): Focus[] {
  return [
    {
      id: 'job',
      title: 'Job',
      actions: [{ id: 'study', label: 'Study', checked: true, slots }],
    },
  ];
}

function WeekHarness({
  initialFocuses = startingFocuses,
  initialRoomItems = [],
}: {
  initialFocuses?: Focus[];
  initialRoomItems?: RoomItem[];
}) {
  const [focuses, setFocuses] = useState(initialFocuses);
  const [roomItems, setRoomItems] = useState<RoomItem[]>(initialRoomItems);
  return (
    <YourWeekStep
      focuses={focuses}
      roomItems={roomItems}
      onPlanChange={({ focuses: nextFocuses, roomItems: nextRoomItems }) => {
        setFocuses(nextFocuses);
        setRoomItems(nextRoomItems);
      }}
      onBack={() => undefined}
    />
  );
}

/** jsdom has no drag implementation, so the events carry a stub dataTransfer. */
function dragOnto(source: HTMLElement, target: HTMLElement, options?: { altKey?: boolean }) {
  const dataTransfer = {
    data: {} as Record<string, string>,
    setData(key: string, value: string) {
      this.data[key] = value;
    },
    getData(key: string) {
      return this.data[key];
    },
    effectAllowed: '',
    dropEffect: '',
  };
  const altKey = options?.altKey ?? false;
  fireEvent.dragStart(source, { dataTransfer, altKey });
  if (altKey) fireEvent.keyDown(window, { key: 'Alt' });
  fireEvent.dragOver(target, { dataTransfer, altKey });
  fireEvent.drop(target, { dataTransfer, altKey });
  if (altKey) fireEvent.keyUp(window, { key: 'Alt' });
  fireEvent.dragEnd(source, { dataTransfer });
}

const precedes = (first: HTMLElement, second: HTMLElement) =>
  Boolean(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING);

function enterEditMode() {
  const edit = screen.queryByRole('button', { name: 'Edit week' });
  if (edit) fireEvent.click(edit);
}

async function openMove(user: ReturnType<typeof userEvent.setup>, name: string) {
  enterEditMode();
  await user.click(screen.getByRole('button', { name }));
  return screen.findByRole('dialog', { name: name.split(',')[0] });
}

async function clickEditorDone(user: ReturnType<typeof userEvent.setup>) {
  await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Done' }));
}

describe('weekEditHint', () => {
  it('names the modifier for the keyboard in use', () => {
    expect(weekEditHint('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)')).toBe(
      'Drag to move · hold ⌥ to copy · right-click for more',
    );
    expect(weekEditHint('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)')).toBe(
      'Drag to move · hold ⌥ to copy · right-click for more',
    );
    expect(weekEditHint('Mozilla/5.0 (Windows NT 10.0; Win64; x64)')).toBe(
      'Drag to move · hold Alt to copy · right-click for more',
    );
  });
});

describe('YourWeekStep', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('opens as a read-only week, then edits from the top-right action', async () => {
    const user = userEvent.setup();
    render(<WeekHarness initialRoomItems={startingRoomItems} />);
    const weekStart = upcomingMonday(new Date(), Intl.DateTimeFormat().resolvedOptions().timeZone);
    const monday = emailDayHeading('Mon', weekStart);

    expect(screen.getByRole('button', { name: 'Edit week' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('region', { name: monday })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Morning' })).toBeInTheDocument();
    expect(screen.getByText('Study')).toBeInTheDocument();
    expect(screen.getByText(/Scrolling/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Study, Mon morning. Job' })).not.toBeInTheDocument();
    expect(screen.queryByText(EDIT_HINT)).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Unscheduled' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Edit week' }));

    expect(screen.getByRole('button', { name: 'Done' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Study, Mon morning. Job' })).toBeInTheDocument();
    expect(screen.getByText(weekEditHint(navigator.userAgent))).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Unscheduled' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Done' }));

    expect(screen.getByRole('button', { name: 'Edit week' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Study, Mon morning. Job' })).not.toBeInTheDocument();
    expect(screen.getByText('Study')).toBeInTheDocument();
  });

  it('shows the week as a day-and-time grid, with an unscheduled column', () => {
    render(<WeekHarness />);
    enterEditMode();
    const weekStart = upcomingMonday(new Date(), Intl.DateTimeFormat().resolvedOptions().timeZone);
    const monday = emailDayStamp('Mon', weekStart);
    const sunday = emailDayStamp('Sun', weekStart);

    expect(screen.getByRole('columnheader', { name: `${monday.weekday} ${monday.date}` })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: `${sunday.weekday} ${sunday.date}` })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Morning' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Afternoon' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Evening' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Anytime' })).toBeInTheDocument();
    expect(screen.getAllByRole('group', { name: /, morning$/ })).toHaveLength(7);
    expect(screen.queryByRole('tablist', { name: 'Days' })).not.toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Unscheduled' })).toBeInTheDocument();
    expect(screen.getByText("Drag an action here when it doesn't have a day yet.")).toBeInTheDocument();
    expect(screen.getByText(weekEditHint(navigator.userAgent))).toBeInTheDocument();
  });

  it('lists an action that is waiting for a day under Unscheduled', () => {
    render(<WeekHarness initialFocuses={focusesWith([])} />);

    expect(screen.getByRole('heading', { name: 'Not yet scheduled' })).toBeInTheDocument();
    expect(screen.getByText('Study')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Study, not yet scheduled. Job' })).not.toBeInTheDocument();

    enterEditMode();
    expect(screen.getByRole('heading', { name: 'Unscheduled' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Study, not yet scheduled. Job' })).toBeInTheDocument();
  });

  it('opens the editor to the right of a day column, and to the left of Sunday', async () => {
    const user = userEvent.setup();
    render(
      <WeekHarness
        initialFocuses={[
          {
            id: 'job',
            title: 'Job',
            actions: [
              { id: 'study', label: 'Study', checked: true, slots: [{ day: 'Mon', dayparts: ['Morning'] }] },
              {
                id: 'lift',
                label: 'Weight lift',
                checked: true,
                slots: [{ day: 'Sun', dayparts: ['Morning'] }],
              },
              { id: 'portfolio', label: 'Update portfolio', checked: true, slots: [] },
            ],
          },
        ]}
      />,
    );

    await openMove(user, 'Study, Mon morning. Job');
    expect(screen.getByRole('dialog', { name: 'Study' })).toHaveAttribute('data-side', 'right');

    await user.keyboard('{Escape}');
    await openMove(user, 'Weight lift, Sun morning. Job');
    expect(screen.getByRole('dialog', { name: 'Weight lift' })).toHaveAttribute('data-side', 'left');

    await user.keyboard('{Escape}');
    await openMove(user, 'Update portfolio, not yet scheduled. Job');
    expect(screen.getByRole('dialog', { name: 'Update portfolio' })).toHaveAttribute('data-side', 'left');
  });

  it('opens a day and time editor from the card, and from a right-click', async () => {
    const user = userEvent.setup();
    render(<WeekHarness />);

    const dialog = await openMove(user, 'Study, Mon morning. Job');
    expect(screen.getByText('Stays on Mon · Morning.')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Done' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Duplicate to...' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Study, Mon morning. Job' })).toHaveFocus();

    fireEvent.contextMenu(screen.getByRole('button', { name: 'Run, Mon morning. Job' }));
    expect(await screen.findByRole('dialog', { name: 'Run' })).toBeInTheDocument();
  });

  it('previews the move and commits it on Done, with undo', async () => {
    const user = userEvent.setup();
    render(<WeekHarness />);

    await openMove(user, 'Study, Mon morning. Job');
    await user.click(screen.getByRole('button', { name: /Thursday/ }));
    await user.click(screen.getByRole('button', { name: 'Afternoon' }));

    expect(screen.getByText('Was Mon · Morning. Moves to Thu · Afternoon.')).toBeInTheDocument();

    await clickEditorDone(user);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Study, Thu afternoon. Job' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Study, Mon morning. Job' })).not.toBeInTheDocument();
    expect(screen.getByText('Study moved to Thu · Afternoon')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Study moved to Thu · Afternoon. Undo to restore it.');
    expect(screen.getByRole('button', { name: 'Undo' })).toHaveFocus();

    await user.click(screen.getByRole('button', { name: 'Undo' }));

    expect(screen.getByRole('button', { name: 'Study, Mon morning. Job' })).toBeInTheDocument();
    expect(screen.queryByText('Study moved to Thu · Afternoon')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Study restored.');
  });

  it('hides times until a day is chosen for an unscheduled action', async () => {
    const user = userEvent.setup();
    render(<WeekHarness initialFocuses={focusesWith([])} />);

    await openMove(user, 'Study, not yet scheduled. Job');
    expect(screen.queryByRole('button', { name: 'Morning' })).not.toBeInTheDocument();
    expect(screen.getByText(/Unscheduled actions wait here until you pick a day/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Thursday/ }));
    expect(screen.getByRole('button', { name: 'Morning' })).toHaveAttribute('aria-pressed', 'true');
    await user.click(screen.getByRole('button', { name: 'Evening' }));
    await clickEditorDone(user);

    expect(screen.getByRole('button', { name: 'Study, Thu evening. Job' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /not yet scheduled/ })).not.toBeInTheDocument();
  });

  it('moves a card onto another cell by dragging, and names the cell under the pointer', () => {
    render(<WeekHarness />);
    enterEditMode();
    const afternoon = screen.getByRole('group', { name: /Monday, .*, afternoon/ });
    const study = screen.getByRole('button', { name: 'Study, Mon morning. Job' });

    const dataTransfer = {
      setData() {},
      getData() {
        return '';
      },
      effectAllowed: '',
      dropEffect: '',
    };
    fireEvent.dragStart(study, { dataTransfer });
    fireEvent.dragOver(afternoon, { dataTransfer });

    expect(screen.getByRole('status')).toHaveTextContent('Moving Study to Mon · Afternoon.');

    fireEvent.drop(afternoon, { dataTransfer });
    fireEvent.dragEnd(study, { dataTransfer });

    expect(screen.getByRole('button', { name: 'Study, Mon afternoon. Job' })).toBeInTheDocument();
    expect(screen.getByText('Study moved to Mon · Afternoon')).toBeInTheDocument();
  });

  it('reorders when one card is dropped onto another', () => {
    render(<WeekHarness />);
    enterEditMode();

    dragOnto(
      screen.getByRole('button', { name: 'Run, Mon morning. Job' }),
      screen.getByRole('button', { name: 'Study, Mon morning. Job' }),
    );

    expect(
      precedes(
        screen.getByRole('button', { name: /^Run, Mon morning/ }),
        screen.getByRole('button', { name: /Study, Mon morning/ }),
      ),
    ).toBe(true);
  });

  it('copies when the drag is holding alt, and leaves the original', () => {
    render(<WeekHarness />);
    enterEditMode();
    const tuesday = screen.getByRole('group', { name: /Tuesday, .*, afternoon/ });

    dragOnto(screen.getByRole('button', { name: 'Study, Mon morning. Job' }), tuesday, { altKey: true });

    expect(screen.getByRole('button', { name: 'Study, Mon morning. Job' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Study, Tue afternoon. Job' })).toBeInTheDocument();
    expect(screen.getByText('Study copied to Tue · Afternoon')).toBeInTheDocument();
  });

  it('unschedules by dropping on the unscheduled column', () => {
    render(<WeekHarness initialFocuses={focusesWith([{ day: 'Mon', dayparts: ['Morning'] }])} />);
    enterEditMode();
    const study = screen.getByRole('button', { name: 'Study, Mon morning. Job' });
    const dataTransfer = {
      setData() {},
      getData() {
        return '';
      },
      effectAllowed: '',
      dropEffect: '',
    };

    fireEvent.dragStart(study, { dataTransfer });
    const column = screen.getByRole('region', { name: 'Unscheduled' });
    fireEvent.dragOver(column, { dataTransfer });

    expect(screen.getByText('Drop here to unschedule')).toBeInTheDocument();

    fireEvent.drop(column, { dataTransfer });
    fireEvent.dragEnd(study, { dataTransfer });

    expect(screen.getByRole('button', { name: 'Study, not yet scheduled. Job' })).toBeInTheDocument();
    expect(screen.getByText('Study moved to unscheduled')).toBeInTheDocument();
  });

  it('shows a day picker before adding copies', async () => {
    const user = userEvent.setup();
    render(<WeekHarness />);

    await openMove(user, 'Study, Mon morning. Job');
    await user.click(screen.getByRole('button', { name: 'Duplicate to...' }));

    expect(screen.getByRole('dialog', { name: 'Study' })).toBeInTheDocument();
    expect(screen.getByText('Days · Pick any')).toBeInTheDocument();
    expect(screen.getByText('Pick a day to choose a time.')).toBeInTheDocument();
    expect(screen.getByText('Pick one or more days.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add copy' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Morning' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Tuesday/ }));
    expect(screen.getByRole('button', { name: 'Add copy' })).toBeEnabled();
    await user.click(screen.getByRole('button', { name: /Thursday/ }));
    expect(screen.getByRole('button', { name: 'Add copies' })).toBeEnabled();
    await user.click(screen.getByRole('button', { name: 'Evening' }));
    await user.click(screen.getByRole('button', { name: 'Add copies' }));

    expect(screen.getByRole('button', { name: 'Study, Mon morning. Job' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Study, Tue evening. Job' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Study, Thu evening. Job' })).toBeInTheDocument();
    expect(screen.getByText('Study copied to Tue · Evening and Thu · Evening')).toBeInTheDocument();
  });

  it('duplicates onto the chosen day and leaves the original', async () => {
    const user = userEvent.setup();
    render(<WeekHarness />);

    await openMove(user, 'Study, Mon morning. Job');
    await user.click(screen.getByRole('button', { name: 'Duplicate to...' }));
    await user.click(screen.getByRole('button', { name: /Tuesday/ }));
    await user.click(screen.getByRole('button', { name: 'Afternoon' }));
    await user.click(screen.getByRole('button', { name: 'Add copy' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Study, Mon morning. Job' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Study, Tue afternoon. Job' })).toBeInTheDocument();
    expect(screen.getByText('Study copied to Tue · Afternoon')).toBeInTheDocument();
  });

  it('copies in front of another item when dropped onto it', () => {
    render(<WeekHarness />);
    enterEditMode();
    const tuesday = screen.getByRole('group', { name: /Tuesday, .*, afternoon/ });

    dragOnto(screen.getByRole('button', { name: 'Study, Mon morning. Job' }), tuesday, { altKey: true });
    dragOnto(screen.getByRole('button', { name: 'Run, Mon morning. Job' }), within(tuesday).getByRole('button', { name: /Study/ }), {
      altKey: true,
    });

    expect(screen.getByRole('button', { name: 'Run, Mon morning. Job' })).toBeInTheDocument();
    expect(
      precedes(
        within(tuesday).getByRole('button', { name: /Run/ }),
        within(tuesday).getByRole('button', { name: /Study/ }),
      ),
    ).toBe(true);
  });

  it('duplicates a scheduled item into unscheduled, then schedules that copy on its own', async () => {
    const user = userEvent.setup();
    render(<WeekHarness initialFocuses={focusesWith([{ day: 'Mon', dayparts: ['Morning'] }])} />);

    await openMove(user, 'Study, Mon morning. Job');
    await user.click(screen.getByRole('button', { name: 'Duplicate to...' }));
    await user.click(screen.getByRole('button', { name: 'Unscheduled' }));
    await user.click(screen.getByRole('button', { name: 'Add copy' }));

    expect(screen.getByRole('button', { name: 'Study, Mon morning. Job' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Study, not yet scheduled. Job' })).toBeInTheDocument();

    await openMove(user, 'Study, not yet scheduled. Job');
    await user.click(screen.getByRole('button', { name: /Thursday/ }));
    await user.click(screen.getByRole('button', { name: 'Evening' }));
    await clickEditorDone(user);

    expect(screen.getByRole('button', { name: 'Study, Mon morning. Job' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Study, Thu evening. Job' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /not yet scheduled/ })).not.toBeInTheDocument();
  });

  it('does not duplicate an action that has no day yet', async () => {
    const user = userEvent.setup();
    render(<WeekHarness initialFocuses={focusesWith([])} />);

    await openMove(user, 'Study, not yet scheduled. Job');
    await user.click(screen.getByRole('button', { name: 'Duplicate to...' }));

    expect(screen.getByRole('dialog', { name: 'Study' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add copy' })).toBeDisabled();
    expect(screen.queryByText('Pick one or more days.')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Study needs a day before it can be duplicated.');
    expect(screen.getAllByRole('button', { name: /Study/ })).toHaveLength(1);
  });

  it('says when the copy would land somewhere the action already is', async () => {
    const user = userEvent.setup();
    render(<WeekHarness />);

    await openMove(user, 'Study, Mon morning. Job');
    await user.click(screen.getByRole('button', { name: 'Duplicate to...' }));
    await user.click(screen.getByRole('button', { name: /Monday/ }));
    await user.click(screen.getByRole('button', { name: 'Add copy' }));

    expect(screen.getByRole('status')).toHaveTextContent('Study is already on Mon · Morning.');
    expect(screen.getByRole('dialog', { name: 'Study' })).toBeInTheDocument();
  });

  it('removes a card and restores it from the toast', async () => {
    const user = userEvent.setup();
    render(<WeekHarness />);

    await openMove(user, 'Study, Mon morning. Job');
    await user.click(screen.getByRole('button', { name: 'Delete' }));

    expect(screen.queryByRole('button', { name: /^Study/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Run, Mon morning. Job' })).toBeInTheDocument();
    expect(screen.getByText('Study removed')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Study removed. Undo to restore it.');
    expect(screen.getByRole('button', { name: 'Undo' })).toHaveFocus();

    await user.click(screen.getByRole('button', { name: 'Undo' }));

    expect(screen.getByRole('button', { name: 'Study, Mon morning. Job' })).toBeInTheDocument();
    expect(screen.queryByText('Study removed')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Study restored.');
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
  });

  it('names a make-room item rather than calling it an action', async () => {
    const user = userEvent.setup();
    render(<WeekHarness initialRoomItems={startingRoomItems} />);

    await openMove(user, 'Scrolling, Wed evening');
    await user.click(screen.getByRole('button', { name: 'Delete' }));

    expect(screen.getByText('Scrolling removed')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Scrolling removed. Undo to restore it.');
  });

  it('replaces the toast so Undo only restores the latest delete', async () => {
    const user = userEvent.setup();
    render(<WeekHarness />);

    await openMove(user, 'Study, Mon morning. Job');
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    await openMove(user, 'Run, Mon morning. Job');
    await user.click(screen.getByRole('button', { name: 'Delete' }));

    expect(screen.queryByText('Study removed')).not.toBeInTheDocument();
    expect(screen.getByText('Run removed')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Undo' }));

    expect(screen.queryByRole('button', { name: /^Study/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Run, Mon morning. Job' })).toBeInTheDocument();
  });

  it('gives a second delete a full countdown of its own', () => {
    vi.useFakeTimers();
    const elapse = (ms: number) =>
      act(() => {
        vi.advanceTimersByTime(ms);
      });
    render(<WeekHarness />);
    enterEditMode();

    fireEvent.click(screen.getByRole('button', { name: 'Study, Mon morning. Job' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    elapse(UNDO_TOAST_MS - 1000);

    fireEvent.click(screen.getByRole('button', { name: 'Run, Mon morning. Job' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    elapse(3000);
    expect(screen.getByText('Run removed')).toBeInTheDocument();

    elapse(UNDO_TOAST_MS);
    expect(screen.queryByText('Run removed')).not.toBeInTheDocument();
  });

  it('offers undo for the latest edit, and that undo does not bring back an earlier delete', async () => {
    const user = userEvent.setup();
    render(<WeekHarness />);

    await openMove(user, 'Study, Mon morning. Job');
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    expect(screen.getByText('Study removed')).toBeInTheDocument();

    await openMove(user, 'Run, Mon morning. Job');
    await user.click(screen.getByRole('button', { name: /Tuesday/ }));
    await user.click(screen.getByRole('button', { name: 'Afternoon' }));
    await clickEditorDone(user);

    expect(screen.queryByText('Study removed')).not.toBeInTheDocument();
    expect(screen.getByText('Run moved to Tue · Afternoon')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Undo' }));

    expect(screen.getByRole('button', { name: 'Run, Mon morning. Job' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Study/ })).not.toBeInTheDocument();
  });

  it('keeps the delete toast while another card’s editor is open', async () => {
    const user = userEvent.setup();
    render(<WeekHarness />);

    await openMove(user, 'Study, Mon morning. Job');
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    await openMove(user, 'Run, Mon morning. Job');

    expect(screen.getByText('Study removed')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();

    await user.keyboard('{Escape}');
    await user.click(screen.getByRole('button', { name: 'Undo' }));

    expect(screen.getByRole('button', { name: 'Study, Mon morning. Job' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
  });

  it('removes one copy and leaves the others', async () => {
    const user = userEvent.setup();
    render(<WeekHarness />);

    await openMove(user, 'Study, Mon morning. Job');
    await user.click(screen.getByRole('button', { name: 'Duplicate to...' }));
    await user.click(screen.getByRole('button', { name: /Tuesday/ }));
    await user.click(screen.getByRole('button', { name: 'Afternoon' }));
    await user.click(screen.getByRole('button', { name: 'Add copy' }));

    await openMove(user, 'Study, Tue afternoon. Job');
    await user.click(screen.getByRole('button', { name: 'Delete' }));

    expect(screen.getByRole('button', { name: 'Study, Mon morning. Job' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Study, Tue afternoon/ })).not.toBeInTheDocument();
  });

  it('removes an unscheduled item from the week', async () => {
    const user = userEvent.setup();
    render(<WeekHarness initialFocuses={focusesWith([])} />);

    await openMove(user, 'Study, not yet scheduled. Job');
    await user.click(screen.getByRole('button', { name: 'Delete' }));

    expect(screen.queryByRole('button', { name: /^Study/ })).not.toBeInTheDocument();
  });

  it('closes the editor from the backdrop and the close button', async () => {
    const user = userEvent.setup();
    render(<WeekHarness />);

    const dialog = await openMove(user, 'Study, Mon morning. Job');
    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    const again = await openMove(user, 'Study, Mon morning. Job');
    fireEvent.click(again);
    expect(dialog).not.toBe(again);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens a confirmation before starting the week over', async () => {
    const user = userEvent.setup();
    const onStartOver = vi.fn();
    render(
      <YourWeekStep
        focuses={startingFocuses}
        roomItems={[]}
        onPlanChange={() => undefined}
        onBack={() => undefined}
        onStartOver={onStartOver}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Start this week over' }));

    expect(await screen.findByRole('heading', { name: 'Start this week over?' })).toBeInTheDocument();
    expect(
      screen.getByText(
        'This will clear your focus, actions, and scheduled times for this week so you can make a new plan.',
      ),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Keep my plan' }));

    expect(screen.queryByRole('heading', { name: 'Start this week over?' })).not.toBeInTheDocument();
    expect(onStartOver).not.toHaveBeenCalled();
  });

  it('starts the week over from the confirmation', async () => {
    const user = userEvent.setup();
    const onStartOver = vi.fn();
    render(
      <YourWeekStep
        focuses={startingFocuses}
        roomItems={[]}
        onPlanChange={() => undefined}
        onBack={() => undefined}
        onStartOver={onStartOver}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Start this week over' }));
    await user.click(await screen.findByRole('button', { name: 'Start over' }));

    expect(onStartOver).toHaveBeenCalledOnce();
  });

  it('closes the start-over confirmation from the close button', async () => {
    const user = userEvent.setup();
    render(
      <YourWeekStep
        focuses={startingFocuses}
        roomItems={[]}
        onPlanChange={() => undefined}
        onBack={() => undefined}
        onStartOver={() => undefined}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Start this week over' }));
    await user.click(await screen.findByRole('button', { name: 'Close' }));

    expect(screen.queryByRole('heading', { name: 'Start this week over?' })).not.toBeInTheDocument();
  });

  it('closes the start-over confirmation on Escape', async () => {
    const user = userEvent.setup();
    render(
      <YourWeekStep
        focuses={startingFocuses}
        roomItems={[]}
        onPlanChange={() => undefined}
        onBack={() => undefined}
        onStartOver={() => undefined}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Start this week over' }));
    expect(await screen.findByRole('heading', { name: 'Start this week over?' })).toBeInTheDocument();

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('heading', { name: 'Start this week over?' })).not.toBeInTheDocument();
  });
});

describe('YourWeekStep on a narrow screen', () => {
  const realMatchMedia = window.matchMedia;

  beforeEach(() => {
    window.matchMedia = ((query: string) =>
      ({
        matches: query === '(max-width: 760px)',
        media: query,
        onchange: null,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        addListener: () => undefined,
        removeListener: () => undefined,
        dispatchEvent: () => false,
      }) as unknown as MediaQueryList) as typeof window.matchMedia;
  });

  afterEach(() => {
    window.matchMedia = realMatchMedia;
  });

  it('shows one day at a time under a day strip', async () => {
    const user = userEvent.setup();
    render(<WeekHarness />);
    const weekStart = upcomingMonday(new Date(), Intl.DateTimeFormat().resolvedOptions().timeZone);
    const monday = emailDayHeading('Mon', weekStart);
    const tuesday = emailDayHeading('Tue', weekStart);

    expect(screen.getByRole('button', { name: 'Edit week' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: monday, selected: true })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: tuesday })).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByRole('heading', { name: monday })).toBeInTheDocument();
    expect(screen.getByText('Study')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Study, Mon morning. Job' })).not.toBeInTheDocument();
    expect(screen.queryByText(EDIT_HINT)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Edit week' }));
    expect(screen.getByRole('button', { name: 'Study, Mon morning. Job' })).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: tuesday }));

    expect(screen.getByRole('heading', { name: tuesday })).toBeInTheDocument();
    expect(screen.getByText('Nothing planned')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Study, Mon morning. Job' })).not.toBeInTheDocument();
  });

  it('moves across the day strip with the arrow keys', async () => {
    const user = userEvent.setup();
    render(<WeekHarness />);
    const weekStart = upcomingMonday(new Date(), Intl.DateTimeFormat().resolvedOptions().timeZone);
    const monday = emailDayHeading('Mon', weekStart);
    const tuesday = emailDayHeading('Tue', weekStart);

    screen.getByRole('tab', { name: monday }).focus();
    await user.keyboard('{ArrowRight}');

    expect(screen.getByRole('tab', { name: tuesday, selected: true })).toHaveFocus();
    expect(screen.getByRole('heading', { name: tuesday })).toBeInTheDocument();
  });

  it('moves from the sheet onto another day', async () => {
    const user = userEvent.setup();
    render(<WeekHarness />);
    const weekStart = upcomingMonday(new Date(), Intl.DateTimeFormat().resolvedOptions().timeZone);

    await openMove(user, 'Study, Mon morning. Job');
    await user.click(screen.getByRole('button', { name: /Thursday/ }));
    await user.click(screen.getByRole('button', { name: 'Afternoon' }));
    await clickEditorDone(user);

    expect(screen.queryByRole('button', { name: 'Study, Mon morning. Job' })).not.toBeInTheDocument();
    expect(screen.getByText('Study moved to Thu · Afternoon')).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: emailDayHeading('Thu', weekStart) }));
    expect(screen.getByRole('button', { name: 'Study, Thu afternoon. Job' })).toBeInTheDocument();
  });

  it('duplicates from the sheet onto another day', async () => {
    const user = userEvent.setup();
    render(<WeekHarness />);
    const weekStart = upcomingMonday(new Date(), Intl.DateTimeFormat().resolvedOptions().timeZone);

    await openMove(user, 'Study, Mon morning. Job');
    await user.click(screen.getByRole('button', { name: 'Duplicate to...' }));
    await user.click(screen.getByRole('button', { name: /Tuesday/ }));
    await user.click(screen.getByRole('button', { name: 'Afternoon' }));
    await user.click(screen.getByRole('button', { name: 'Add copy' }));

    expect(screen.getByRole('button', { name: 'Study, Mon morning. Job' })).toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: emailDayHeading('Tue', weekStart) }));
    expect(screen.getByRole('button', { name: 'Study, Tue afternoon. Job' })).toBeInTheDocument();
  });

  it('deletes from the sheet', async () => {
    const user = userEvent.setup();
    render(<WeekHarness />);

    await openMove(user, 'Study, Mon morning. Job');
    await user.click(screen.getByRole('button', { name: 'Delete' }));

    expect(screen.queryByRole('button', { name: /^Study/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Run, Mon morning. Job' })).toBeInTheDocument();
    expect(screen.getByText('Study removed')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Undo' })).toHaveFocus();
  });
});

describe('room intention on the week', () => {
  const intended: RoomItem[] = [
    {
      id: 'scrolling',
      label: 'Scrolling',
      intention: 'Rest & recovery',
      slots: [{ day: 'Wed', dayparts: ['Evening'] }],
    },
  ];

  it('shows the phrase under the item, the same way a goal names an action', async () => {
    const user = userEvent.setup();
    render(<WeekHarness initialRoomItems={intended} />);

    expect(screen.getByText('Rest & recovery')).toHaveClass('tend-week__item-meta');

    enterEditMode();
    const open = screen.getByRole('button', { name: 'Scrolling, Wed evening. Rest & recovery' });
    const card = open.closest('.tend-week__item');
    expect(card?.querySelector('.tend-week__item-meta')).toHaveTextContent('Rest & recovery');
    expect(card?.querySelector('.tend-week__edit-goal')).toBeNull();

    const dialog = await openMove(user, 'Scrolling, Wed evening. Rest & recovery');
    expect(within(dialog).getByText('Rest & recovery')).toBeInTheDocument();
  });
});

describe('edit goal from a week card', () => {
  it('labels the drag handle when it is hovered', () => {
    render(<WeekHarness />);
    enterEditMode();

    const grip = document.querySelector('.tend-week__grip');
    expect(grip?.querySelector('[role="tooltip"]')).toHaveTextContent('Drag to another time');
  });

  it('places the pencil on the goal row, beside the goal name', () => {
    render(<WeekHarness />);
    enterEditMode();

    const open = screen.getByRole('button', { name: 'Study, Mon morning. Job' });
    const card = open.closest('.tend-week__item');
    const meta = card?.querySelector('.tend-week__item-meta');
    expect(meta).toHaveTextContent('Job');
    expect(meta?.querySelector('.tend-week__edit-goal')).toBeNull();
    expect(meta?.nextElementSibling).toHaveAccessibleName('Edit Job goal');
  });

  it('opens the goal editor from the pencil and leaves scheduling for the card', async () => {
    const user = userEvent.setup();
    render(<WeekHarness />);
    enterEditMode();

    await user.click(screen.getAllByRole('button', { name: 'Edit Job goal' })[0]);

    expect(screen.getByRole('dialog', { name: 'Edit goal' })).toBeInTheDocument();
    expect(screen.getByLabelText('Goal name')).toHaveValue('Job');
    expect(screen.queryByRole('dialog', { name: 'Study' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Close' }));
    await user.click(screen.getByRole('button', { name: 'Study, Mon morning. Job' }));
    expect(screen.getByRole('dialog', { name: 'Study' })).toBeInTheDocument();
  });

  it('puts an action added in the goal editor into Unscheduled', async () => {
    const user = userEvent.setup();
    render(<WeekHarness />);
    enterEditMode();

    await user.click(screen.getAllByRole('button', { name: 'Edit Job goal' })[0]);
    await user.click(screen.getByRole('button', { name: '+ Add action' }));
    await user.type(screen.getByLabelText('New action'), 'Walk{Enter}');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    const unscheduled = screen.getByRole('region', { name: 'Unscheduled' });
    expect(within(unscheduled).getByRole('button', { name: 'Walk, not yet scheduled. Job' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Study, Mon morning. Job' })).toBeInTheDocument();
  });

  it('renames the goal on every card that belongs to it', async () => {
    const user = userEvent.setup();
    render(<WeekHarness />);
    enterEditMode();

    await user.click(screen.getAllByRole('button', { name: 'Edit Job goal' })[0]);
    await user.clear(screen.getByLabelText('Goal name'));
    await user.type(screen.getByLabelText('Goal name'), 'Career');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(screen.queryByRole('dialog', { name: 'Edit goal' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Study, Mon morning. Career' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Run, Mon morning. Career' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Your week' })).toBeInTheDocument();
  });

  it('does not put a pencil on a life item', () => {
    render(<WeekHarness initialRoomItems={startingRoomItems} />);
    enterEditMode();
    expect(screen.queryByRole('button', { name: /Edit Scrolling goal/ })).not.toBeInTheDocument();
  });

  it('leaves edit mode when Send my week is clicked', async () => {
    const user = userEvent.setup();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));
    render(<WeekHarness />);
    enterEditMode();

    expect(screen.getByRole('button', { name: 'Done' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Study, Mon morning. Job' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Email this to me' }));
    expect(screen.getByRole('button', { name: 'Edit week' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByRole('button', { name: 'Study, Mon morning. Job' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Edit week' }));
    expect(screen.getByRole('button', { name: 'Done' })).toBeInTheDocument();

    await user.type(screen.getByLabelText('Where should we send your week?'), 'you@email.com');
    await user.click(screen.getByRole('button', { name: 'Send my week' }));

    expect(screen.getByRole('button', { name: 'Edit week' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByRole('button', { name: 'Study, Mon morning. Job' })).not.toBeInTheDocument();
    expect(screen.getByText('Study')).toBeInTheDocument();
    vi.unstubAllGlobals();
  });

  it('hides Back while the email form is open', async () => {
    const user = userEvent.setup();
    render(<WeekHarness />);

    expect(screen.getByRole('button', { name: '‹ Back' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Email this to me' }));
    expect(screen.queryByRole('button', { name: '‹ Back' })).not.toBeInTheDocument();
    expect(screen.getByLabelText('Where should we send your week?')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByRole('button', { name: '‹ Back' })).toBeInTheDocument();
  });
});

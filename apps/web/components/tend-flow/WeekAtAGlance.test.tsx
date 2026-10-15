import { useState } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Focus, RoomItem } from '@tend/core';
import { MakeRoomStep } from './MakeRoomStep';
import { PrioritizeStep } from './PrioritizeStep';
import { WeekAtAGlance, WeekGlancePlace } from './WeekAtAGlance';

const focuses: Focus[] = [
  {
    id: 'job',
    title: 'Work',
    colorIndex: 0,
    actions: [
      { id: 'study', label: 'Study', checked: true, slots: [{ day: 'Wed', dayparts: ['Morning'] }] },
      { id: 'call', label: 'Call', checked: true, slots: [] },
      { id: 'later', label: 'Later', checked: false, slots: [{ day: 'Tue', dayparts: ['Evening'] }] },
    ],
  },
  {
    id: 'health',
    title: 'Health',
    colorIndex: 1,
    actions: [{ id: 'yoga', label: 'Go to yoga', checked: true, slots: [{ day: 'Wed', dayparts: ['Evening'] }] }],
  },
];

const roomItems: RoomItem[] = [
  { id: 'dinner', label: 'Dinner with family', slots: [{ day: 'Wed', dayparts: ['Evening'] }] },
  { id: 'read', label: 'Read', slots: [] },
];

function glanceRegion() {
  return screen.getByRole('region', { name: 'Your week at a glance' });
}

describe('WeekAtAGlance', () => {
  it('shows an empty week without a plan count', async () => {
    const user = userEvent.setup();
    render(
      <WeekAtAGlance focuses={[]} roomItems={[]}>
        <WeekGlancePlace />
      </WeekAtAGlance>,
    );

    const glance = glanceRegion();
    expect(within(glance).getByRole('heading', { name: 'Your week at a glance' })).toBeInTheDocument();
    expect(within(glance).queryByText('This includes all actions from your priorities.')).not.toBeInTheDocument();
    expect(within(glance).queryByText(/day planned/)).not.toBeInTheDocument();

    const toggle = within(glance).getByRole('button', { name: 'Hide' });
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(within(glance).getAllByRole('button', { name: /, nothing planned$/ })).toHaveLength(7);
    expect(within(glance).getByText('Nothing planned for this day.')).toBeInTheDocument();
    expect(glance.querySelector('.tend-glance-board')).not.toBeInTheDocument();

    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(within(glance).queryByText('Nothing planned for this day.')).not.toBeInTheDocument();
    expect(toggle).toHaveFocus();
  });

  it('lists the selected day and marks it without a second set of columns', async () => {
    const user = userEvent.setup();
    render(
      <WeekAtAGlance focuses={focuses} roomItems={roomItems} activeDay="Wed">
        <WeekGlancePlace />
      </WeekAtAGlance>,
    );

    const glance = glanceRegion();
    expect(within(glance).getByText('1 day planned · 3 actions')).toBeInTheDocument();
    expect(within(glance).getByRole('button', { name: 'Wed, 3 items' })).toHaveAttribute('aria-pressed', 'true');
    expect(within(glance).getByRole('button', { name: 'Mon, nothing planned' })).toHaveAttribute('aria-pressed', 'false');
    expect(within(glance).getByText('Study').closest('li')).toHaveTextContent('Morning');
    expect(within(glance).getByText('Study').closest('li')).toHaveTextContent('Work');
    expect(within(glance).getByText('Go to yoga').closest('li')).toHaveTextContent('Health');
    expect(within(glance).getByText('Dinner with family').closest('li')).toHaveTextContent('Make room');
    expect(within(glance).queryByText('Call')).not.toBeInTheDocument();
    expect(within(glance).queryByText('Later')).not.toBeInTheDocument();
    expect(within(glance).queryByText('Read')).not.toBeInTheDocument();
    expect(within(glance).getByText('Study').closest('li')?.querySelector('[data-focus-color]')).toHaveAttribute(
      'data-focus-color',
      '0',
    );
    expect(within(glance).getByText('Go to yoga').closest('li')?.querySelector('[data-focus-color]')).toHaveAttribute(
      'data-focus-color',
      '1',
    );

    await user.click(within(glance).getByRole('button', { name: 'Mon, nothing planned' }));
    expect(within(glance).getByRole('button', { name: 'Mon, nothing planned' })).toHaveAttribute('aria-pressed', 'true');
    expect(within(glance).getByText('Nothing planned for this day.')).toBeInTheDocument();
    expect(within(glance).queryByText('Study')).not.toBeInTheDocument();

    await user.click(within(glance).getByRole('heading', { name: 'Your week at a glance' }));
    expect(within(glance).getByRole('button', { name: 'Show' })).toHaveAttribute('aria-expanded', 'false');
    expect(within(glance).queryByText('Nothing planned for this day.')).not.toBeInTheDocument();
  });
});

describe('WeekAtAGlance on a narrow screen', () => {
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

  it('expands the week in place from the collapsed card', async () => {
    const user = userEvent.setup();
    render(
      <WeekAtAGlance focuses={focuses} roomItems={roomItems}>
        <WeekGlancePlace />
      </WeekAtAGlance>,
    );

    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    const card = screen.getByRole('region', { name: 'Your week at a glance' });
    expect(within(card).queryByText('This includes all actions from your priorities.')).not.toBeInTheDocument();
    expect(within(card).getByText('1 day planned · 3 actions')).toBeInTheDocument();
    expect(within(card).queryByText('Study')).not.toBeInTheDocument();

    const toggle = within(card).getByRole('button', { name: 'Show' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    toggle.focus();
    await user.keyboard('{Enter}');

    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(toggle).toHaveAccessibleName('Hide');
    expect(within(card).getByRole('button', { name: 'Wed, 3 items' })).toHaveAttribute('aria-pressed', 'true');
    expect(within(card).getByText('Study')).toBeInTheDocument();
    expect(card.querySelector('.tend-glance-board')).not.toBeInTheDocument();
    expect(toggle).toHaveFocus();

    await user.keyboard(' ');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(within(card).queryByText('Study')).not.toBeInTheDocument();
    expect(toggle).toHaveFocus();
  });
});

describe('steps share the week glance', () => {
  function names(step: HTMLElement) {
    return within(step)
      .getAllByRole('listitem')
      .map((item) => item.textContent?.replace(/\s+/g, ' ').trim());
  }

  it('shows the same plans on step 3 and step 4', () => {
    const { unmount } = render(
      <PrioritizeStep
        focuses={focuses}
        roomItems={roomItems}
        onChange={() => undefined}
        onRoomItemsChange={() => undefined}
        onBack={() => undefined}
        onContinue={() => undefined}
      />,
    );
    const onPrioritize = names(glanceRegion());
    unmount();

    render(
      <MakeRoomStep
        focuses={focuses}
        items={roomItems}
        onChange={() => undefined}
        onFocusesChange={() => undefined}
        onBack={() => undefined}
        onContinue={() => undefined}
      />,
    );
    expect(names(glanceRegion())).toEqual(onPrioritize);
    expect(onPrioritize.join(' ')).toContain('Study');
    expect(onPrioritize.join(' ')).toContain('Dinner with family');
  });

  it('updates when an action is checked, renamed, or scheduled', async () => {
    const user = userEvent.setup();
    function Harness() {
      const [current, setCurrent] = useState(focuses);
      return (
        <PrioritizeStep
          focuses={current}
          roomItems={roomItems}
          onChange={setCurrent}
          onRoomItemsChange={() => undefined}
          onBack={() => undefined}
          onContinue={() => undefined}
        />
      );
    }
    render(<Harness />);

    const glance = glanceRegion();
    expect(within(glance).queryByText('Call')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '+ Add a time' }));
    await user.click(screen.getByRole('button', { name: 'Mon' }));
    await user.click(screen.getByRole('button', { name: 'Morning' }));

    expect(within(glanceRegion()).getByText('Call')).toBeInTheDocument();
    expect(within(glanceRegion()).getByRole('button', { name: 'Mon, 1 item' })).toHaveAttribute('aria-pressed', 'true');

    await user.click(screen.getByRole('checkbox', { name: 'Choose Study' }));
    expect(within(glanceRegion()).queryByText('Study')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Edit Call' }));
    const field = screen.getByRole('textbox', { name: 'Edit Call' });
    await user.clear(field);
    await user.type(field, 'Phone Sarah');
    await user.tab();

    expect(within(glanceRegion()).getByText('Phone Sarah')).toBeInTheDocument();
    expect(within(glanceRegion()).queryByText('Call')).not.toBeInTheDocument();
  });
});

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { Focus } from '@tend/core';
import { EditGoal } from './EditGoal';

const goal: Focus = {
  id: 'strength',
  title: 'Get stronger',
  actions: [
    {
      id: 'lift',
      label: 'Strength training',
      checked: true,
      slots: [{ day: 'Mon', dayparts: ['Evening'] }],
    },
    { id: 'rest', label: 'Rest', checked: false, slots: [] },
  ],
};

function renderEditor(onSave = vi.fn(), onClose = vi.fn()) {
  render(<EditGoal goal={goal} closeLabel="Close" onSave={onSave} onClose={onClose} />);
  return { onSave, onClose };
}

describe('EditGoal', () => {
  it('keeps Save disabled until something changes', () => {
    renderEditor();
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled();
  });

  it('saves a renamed goal and a new unscheduled action', async () => {
    const user = userEvent.setup();
    const { onSave } = renderEditor();

    await user.clear(screen.getByLabelText('Goal name'));
    await user.type(screen.getByLabelText('Goal name'), 'Strength');
    await user.click(screen.getByRole('button', { name: '+ Add action' }));
    const added = screen.getByLabelText('New action');
    expect(added).toHaveFocus();
    await user.type(added, 'Walk{Enter}');
    expect(screen.getByDisplayValue('Walk')).toBeInTheDocument();
    expect(screen.getByLabelText('New action')).toHaveValue('');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(onSave).toHaveBeenCalledTimes(1);
    const next = onSave.mock.calls[0][0] as Focus;
    expect(next).toMatchObject({ id: 'strength', title: 'Strength' });
    expect(next.actions[0]).toMatchObject({ id: 'lift', checked: true, slots: [{ day: 'Mon', dayparts: ['Evening'] }] });
    expect(next.actions[2]).toMatchObject({ label: 'Walk', checked: true, slots: [] });
  });

  it('cancels a new action with Escape and leaves the editor open', async () => {
    const user = userEvent.setup();
    const { onClose } = renderEditor();

    await user.click(screen.getByRole('button', { name: '+ Add action' }));
    await user.type(screen.getByLabelText('New action'), 'Walk');
    await user.keyboard('{Escape}');

    expect(screen.queryByLabelText('New action')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '+ Add action' })).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: 'Discard these changes?' })).not.toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('keeps the draft and explains when saving fails', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockRejectedValue(new Error('offline'));
    renderEditor(onSave);

    await user.type(screen.getByLabelText('Goal name'), ' today');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByRole('alert')).toHaveTextContent("Those changes didn't save. You can try again.");
    expect(screen.getByLabelText('Goal name')).toHaveValue('Get stronger today');
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeEnabled();
  });

  it('shows a loading label while saving', async () => {
    const user = userEvent.setup();
    let release: () => void = () => undefined;
    const onSave = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          release = resolve;
        }),
    );
    renderEditor(onSave);

    await user.type(screen.getByLabelText('Goal name'), ' today');
    const saving = user.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByRole('button', { name: 'Saving...' })).toHaveAttribute('aria-busy', 'true');
    release();
    await saving;
  });

  it('asks before removing an action that is on the week', async () => {
    const user = userEvent.setup();
    const { onSave } = renderEditor();

    await user.click(screen.getByRole('button', { name: 'Remove Strength training' }));
    expect(screen.getByRole('dialog', { name: 'Remove this action?' })).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Remove' }));
    expect(screen.queryByDisplayValue('Strength training')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    const next = onSave.mock.calls[0][0] as Focus;
    expect(next.actions.map((action) => action.id)).toEqual(['rest']);
  });

  it('discards edits on cancel after confirming', async () => {
    const user = userEvent.setup();
    const { onSave, onClose } = renderEditor();

    await user.type(screen.getByLabelText('Goal name'), ' today');
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByRole('dialog', { name: 'Discard these changes?' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Discard' }));

    expect(onSave).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes immediately when nothing changed', async () => {
    const user = userEvent.setup();
    const { onClose } = renderEditor();

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

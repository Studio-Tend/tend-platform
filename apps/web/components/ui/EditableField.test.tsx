import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { EditableField } from './EditableField';
import { FocusesStep } from '@/components/tend-flow/FocusesStep';
import type { Focus } from '@tend/core';

describe('EditableField', () => {
  it('reverts an empty title instead of saving it', async () => {
    const user = userEvent.setup();
    render(<EditableField value="Career development" ariaLabel="Edit focus" onCommit={() => {}} />);

    await user.click(screen.getByRole('button', { name: 'Edit focus' }));
    await user.clear(screen.getByLabelText('Edit focus'));
    await user.tab();

    expect(screen.getByRole('button', { name: 'Edit focus' })).toHaveTextContent('Career development');
  });

  it('deletes when empty if onDelete is provided', async () => {
    const user = userEvent.setup();
    let deleted = false;
    render(
      <EditableField value="Call mom" ariaLabel="Edit action" onCommit={() => {}} onDelete={() => { deleted = true; }} />
    );

    await user.click(screen.getByRole('button', { name: 'Edit action' }));
    await user.clear(screen.getByLabelText('Edit action'));
    await user.tab();

    expect(deleted).toBe(true);
  });
});

describe('FocusesStep', () => {
  it('keeps the previous title when the edit is cleared', async () => {
    const user = userEvent.setup();

    function Harness() {
      const [focuses, setFocuses] = useState<Focus[]>([{ id: '1', title: 'Job', actions: [] }]);
      return <FocusesStep focuses={focuses} onChange={setFocuses} onContinue={() => {}} />;
    }

    render(<Harness />);
    await user.click(screen.getByRole('button', { name: 'Edit Job' }));
    await user.clear(screen.getByLabelText('Edit Job'));
    await user.tab();

    expect(screen.getByRole('button', { name: 'Edit Job' })).toBeInTheDocument();
  });
});

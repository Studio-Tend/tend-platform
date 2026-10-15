import { useState, type KeyboardEvent } from 'react';

interface EditableFieldProps {
  value: string;
  onCommit: (value: string) => void;
  /** If set, an empty commit deletes instead of reverting. */
  onDelete?: () => void;
  ariaLabel: string;
  variant?: 'text' | 'title';
  /** Open in edit mode on mount (new empty rows). */
  autoFocusEdit?: boolean;
}

export function EditableField({
  value,
  onCommit,
  onDelete,
  ariaLabel,
  variant = 'text',
  autoFocusEdit = false,
}: EditableFieldProps) {
  const [editing, setEditing] = useState(autoFocusEdit);
  const [draft, setDraft] = useState(value);

  const startEditing = () => {
    setDraft(value);
    setEditing(true);
  };

  const finishEditing = () => {
    const trimmed = draft.trim();
    setEditing(false);
    if (!trimmed) {
      if (onDelete) onDelete();
      return;
    }
    if (trimmed !== value) onCommit(trimmed);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      event.currentTarget.blur();
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      setDraft(value);
      setEditing(false);
    }
  };

  if (editing) {
    return (
      <input
        type="text"
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={finishEditing}
        onKeyDown={handleKeyDown}
        className={variant === 'title' ? 'tend-edit-input tend-edit-input--title' : 'tend-edit-input'}
        aria-label={ariaLabel}
      />
    );
  }

  return (
    <button
      type="button"
      className={variant === 'title' ? 'tend-editable-title' : 'tend-editable-text'}
      onClick={startEditing}
      aria-label={ariaLabel}
    >
      {value}
    </button>
  );
}

import { useEffect, type RefObject } from 'react';

/**
 * Opens a `<dialog>` with `showModal` when `open` is true, and focuses
 * `focusRef` after it is shown. Falls back to the `open` attribute where
 * `showModal` is missing (tests).
 */
export function useDialogModal(
  open: boolean,
  dialogRef: RefObject<HTMLDialogElement | null>,
  focusRef?: RefObject<HTMLElement | null>,
) {
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open) {
      if (!dialog.open) {
        if (typeof dialog.showModal === 'function') {
          dialog.showModal();
        } else {
          dialog.setAttribute('open', '');
        }
      }
      focusRef?.current?.focus();
      return;
    }

    if (dialog.open) {
      if (typeof dialog.close === 'function') {
        dialog.close();
      } else {
        dialog.removeAttribute('open');
      }
    }
  }, [open, dialogRef, focusRef]);
}

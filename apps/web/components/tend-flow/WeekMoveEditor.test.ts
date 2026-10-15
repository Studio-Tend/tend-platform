import { describe, expect, it } from 'vitest';
import { editorFrame } from './WeekMoveEditor';

const viewport = { viewportWidth: 1280, viewportHeight: 800 };

describe('editorFrame', () => {
  it('stays aligned with the card when the dialog fits below it', () => {
    const frame = editorFrame({
      ...viewport,
      cardTop: 180,
      columnLeft: 240,
      columnRight: 360,
      dialogWidth: 320,
      dialogHeight: 420,
      side: 'right',
    });

    expect(frame.top).toBe(180);
    expect(frame.left).toBe(368);
    expect(frame.maxHeight).toBe(768);
  });

  it('shifts up when aligning to the card would leave the dialog past the bottom', () => {
    const frame = editorFrame({
      ...viewport,
      cardTop: 520,
      columnLeft: 240,
      columnRight: 360,
      dialogWidth: 320,
      dialogHeight: 420,
      side: 'right',
    });

    expect(frame.top).toBe(364);
    expect(frame.top + 420).toBe(800 - 16);
  });

  it('caps a dialog taller than the viewport and pins it to the margin', () => {
    const frame = editorFrame({
      ...viewport,
      cardTop: 520,
      columnLeft: 900,
      columnRight: 1040,
      dialogWidth: 320,
      dialogHeight: 1100,
      side: 'left',
    });

    expect(frame.maxHeight).toBe(768);
    expect(frame.top).toBe(16);
    expect(frame.left).toBe(900 - 8 - 320);
  });
});

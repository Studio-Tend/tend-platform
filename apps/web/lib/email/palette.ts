/**
 * Email clients can't read CSS variables or Tailwind classes, so the template
 * needs raw values. They come from the token package, never hand-copied hex,
 * so the email can't drift from the app.
 *
 * Tokens export `color`, not `colors`.
 */
import { color } from '@tend/ui-tokens';

export const palette = {
  canvas: color.cream,
  text: color.ink,
  textSoft: color.inkSoft,
  accentText: color.deepShade, // 4.97:1 on cream, approved for labels
  border: color.lineStrong,
  divider: color.line,
  roomWash: color.doorBlueWash,
} as const;

// Most email clients won't load web fonts, so Georgia and the system sans carry the look.
export const fonts = {
  serif: "Fraunces, Georgia, 'Times New Roman', serif",
  sans: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
} as const;

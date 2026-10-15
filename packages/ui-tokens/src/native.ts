import { color, textStyle, type fontWeight, type TextStyleToken } from './tokens';

/** React Native letterSpacing is in px, not em. */
export function trackingPx(em: number, fontSize: number): number {
  return Math.round(em * fontSize * 100) / 100;
}

export type LoadedFonts = Record<
  'serif' | 'sans',
  Partial<Record<keyof typeof fontWeight, string>>
>;

/**
 * Builds a React Native text style from a token.
 * `fonts` maps each family and weight to the name registered with expo-font, e.g.
 * { serif: { regular: 'Fraunces_400Regular' },
 *   sans: { regular: 'Inter_400Regular', medium: 'Inter_500Medium' } }
 */
export function nativeTextStyle(token: TextStyleToken, fonts: LoadedFonts) {
  const s = textStyle[token];
  const fontFamily = fonts[s.font][s.weight];
  if (!fontFamily) {
    throw new Error(`No ${s.font} ${s.weight} font registered for text style "${token}"`);
  }
  return {
    fontFamily,
    fontSize: s.size,
    lineHeight: s.lineHeight,
    letterSpacing: trackingPx(s.tracking, s.size),
    color: color.ink,
    ...('uppercase' in s && s.uppercase ? { textTransform: 'uppercase' as const } : {}),
  };
}

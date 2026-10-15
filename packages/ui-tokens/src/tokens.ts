/**
 * Tend design tokens: the single source of truth.
 *
 * Web consumes the generated CSS in `css/` (run `pnpm --filter @tend/ui-tokens css`).
 * Mobile imports these values directly.
 *
 * Units: sizes are px numbers (the CSS generator converts to rem).
 * Letter spacing is in em; on React Native use `trackingPx` from `./native`.
 *
 * This file must stay import-free: build scripts load it with Node type stripping.
 */

export const color = {
  cream: '#FAFAF8',
  ink: '#17161F',
  inkSoft: '#4C5677',
  inkHover: '#2C2C3A',
  doorBlue: '#A3B1D3',
  deepShade: '#5C6C97',
  /** Destructive actions, such as Delete. */
  brick: '#A8322A',
  white: '#FFFFFF',
  /** Decorative dividers only. Too faint to mark a control's edge. */
  line: 'rgba(23, 22, 31, 0.12)',
  /** Input and control borders: at least 3:1 on cream (WCAG 1.4.11). */
  lineStrong: '#868B9E',
  /** Pressed or hover wash behind ink text. */
  doorBlueWash: 'rgba(163, 177, 211, 0.14)',
  /** Optional solid tint for future selected-row treatments; current planner uses doorBlueWash. */
  doorBlueSoft: '#E9ECF5',
  /** Focus marker swatches only, never text or a fill for cards/buttons. No visual adoption yet. */
  focus1: '#5C6C97',
  focus2: '#6C887D',
  focus3: '#A16E5A',
  focus4: '#86677D',
  focus5: '#91753F',
  focus6: '#477F89',
} as const;

export type ColorToken = keyof typeof color;

/**
 * One color per focus, in assignment order (`focus1` through `focus6`).
 * Indicator dots only — never text or a card fill.
 */
export const focusPalette = [
  'focus1',
  'focus2',
  'focus3',
  'focus4',
  'focus5',
  'focus6',
] as const satisfies readonly ColorToken[];

export const fontFamily = {
  serif: {
    family: 'Fraunces',
    fallback: ['Georgia', '"Times New Roman"', 'serif'],
    /** CSS variable that next/font sets in apps/web. */
    cssVariable: '--font-fraunces',
  },
  sans: {
    family: 'Inter',
    fallback: ['ui-sans-serif', 'system-ui', '-apple-system', '"Segoe UI"', 'sans-serif'],
    cssVariable: '--font-inter',
  },
} as const;

export const fontWeight = {
  regular: 400,
  medium: 500,
  semibold: 600,
} as const;

type TextStyleDef = {
  font: keyof typeof fontFamily;
  size: number;
  lineHeight: number;
  weight: keyof typeof fontWeight;
  tracking: number;
  uppercase?: boolean;
};

/** Semantic type roles. Fraunces carries the voice, Inter carries structure. */
export const textStyle = {
  display: { font: 'serif', size: 44, lineHeight: 50, weight: 'regular', tracking: -0.02 },
  title: { font: 'serif', size: 32, lineHeight: 38, weight: 'regular', tracking: -0.01 },
  heading: { font: 'serif', size: 24, lineHeight: 31, weight: 'regular', tracking: 0 },
  statement: { font: 'serif', size: 20, lineHeight: 28, weight: 'regular', tracking: 0 },
  bodyLg: { font: 'sans', size: 18, lineHeight: 28, weight: 'regular', tracking: 0 },
  body: { font: 'sans', size: 16, lineHeight: 24, weight: 'regular', tracking: 0 },
  bodySm: { font: 'sans', size: 14, lineHeight: 20, weight: 'regular', tracking: 0 },
  label: {
    font: 'sans',
    size: 12,
    lineHeight: 16,
    weight: 'medium',
    tracking: 0.08,
    uppercase: true,
  },
  caption: { font: 'sans', size: 12, lineHeight: 16, weight: 'regular', tracking: 0 },
} as const satisfies Record<string, TextStyleDef>;

export type TextStyleToken = keyof typeof textStyle;

/** 4px base, matching Tailwind's default spacing multiplier. */
export const spaceUnit = 4;

export const space = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
  20: 80,
} as const;

export const radius = {
  sm: 4,
  md: 8,
  lg: 16,
  full: 9999,
} as const;

/** Max widths for reading and app layouts. */
export const container = {
  reading: 640,
  app: 1120,
} as const;

/** Minimum touch target in px. */
export const minTouchTarget = 44;

export const motion = {
  duration: { fast: 150, base: 250 },
  easing: {
    /** CSS timing function. */
    standard: 'cubic-bezier(0.2, 0, 0, 1)',
    /** Same curve as Reanimated `Easing.bezier` arguments. */
    standardBezier: [0.2, 0, 0, 1],
  },
} as const;

export const focusRing = {
  color: 'deepShade',
  width: 2,
  offset: 2,
} as const satisfies { color: ColorToken; width: number; offset: number };

/**
 * Approved foreground/background pairs with their WCAG minimum.
 * `scripts/check-contrast.ts` fails CI if any pair drops below `min`.
 * 4.5 = normal text. 3 = large text (24px+, or ~18.7px+ bold) and UI boundaries.
 */
export const contrastPairs = [
  { fg: 'ink', bg: 'cream', min: 4.5, use: 'Default text' },
  { fg: 'inkSoft', bg: 'cream', min: 4.5, use: 'Secondary text, placeholders' },
  { fg: 'deepShade', bg: 'cream', min: 4.5, use: 'Links, focus ring, accent text' },
  { fg: 'brick', bg: 'cream', min: 4.5, use: 'Destructive actions, such as Delete' },
  { fg: 'lineStrong', bg: 'cream', min: 3, use: 'Input and control borders' },
  { fg: 'white', bg: 'deepShade', min: 4.5, use: 'Label pills, buttons on deep shade' },
  { fg: 'cream', bg: 'deepShade', min: 4.5, use: 'Cream text on deep shade' },
  { fg: 'ink', bg: 'doorBlue', min: 4.5, use: 'Hook/poll cards, selected states' },
  { fg: 'white', bg: 'ink', min: 4.5, use: 'Primary button' },
  { fg: 'white', bg: 'inkHover', min: 4.5, use: 'Primary button hover' },
  { fg: 'ink', bg: 'doorBlueSoft', min: 4.5, use: 'Text on optional solid tinted surfaces' },
  { fg: 'inkSoft', bg: 'doorBlueSoft', min: 4.5, use: 'Secondary text on optional tinted surfaces' },
  ...(['focus1', 'focus2', 'focus3', 'focus4', 'focus5', 'focus6'] as const).flatMap((fg) =>
    (['cream', 'white', 'doorBlueSoft'] as const).map((bg) => ({
      fg,
      bg,
      min: 3 as const,
      use: 'Focus marker (graphical only, not text)',
    })),
  ),
] as const satisfies ReadonlyArray<{
  fg: ColorToken;
  bg: ColorToken;
  min: 3 | 4.5;
  use: string;
}>;

/**
 * Pairs that look on-brand but fail. Checked too, so the check fails
 * if a palette change silently makes them "pass" and invites reuse.
 * White or cream on door blue is about 2:1, below even the large-text minimum.
 */
export const forbiddenPairs = [
  { fg: 'white', bg: 'doorBlue' },
  { fg: 'cream', bg: 'doorBlue' },
  { fg: 'doorBlue', bg: 'cream' },
  { fg: 'inkSoft', bg: 'doorBlue', below: 4.5 },
  { fg: 'deepShade', bg: 'doorBlue', below: 4.5 },
  { fg: 'deepShade', bg: 'doorBlueSoft', below: 4.5 },
] as const satisfies ReadonlyArray<{ fg: ColorToken; bg: ColorToken; below?: 3 | 4.5 }>;

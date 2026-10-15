/**
 * Regression guardrail: these are the visually approved tokens in the existing
 * weekly planner. Changing them is possible, but requires a deliberate design
 * review, before/after screenshots, and corresponding updates to this test and
 * docs/design-system.md. Do not change them just to match an external mockup.
 */
import assert from 'node:assert/strict';
import { color, minTouchTarget, radius, textStyle } from '../src/tokens.ts';

const typography = {
  display: textStyle.display,
  title: textStyle.title,
  heading: textStyle.heading,
  statement: textStyle.statement,
  bodyLg: textStyle.bodyLg,
  body: textStyle.body,
  bodySm: textStyle.bodySm,
  label: textStyle.label,
  caption: textStyle.caption,
};
const sizes = Object.fromEntries(
  Object.entries(typography).map(([key, value]) => [
    key,
    [value.size, value.lineHeight, value.weight, value.tracking],
  ]),
);
assert.deepEqual(sizes, {
  display: [44, 50, 'regular', -0.02],
  title: [32, 38, 'regular', -0.01],
  heading: [24, 31, 'regular', 0],
  statement: [20, 28, 'regular', 0],
  bodyLg: [18, 28, 'regular', 0],
  body: [16, 24, 'regular', 0],
  bodySm: [14, 20, 'regular', 0],
  label: [12, 16, 'medium', 0.08],
  caption: [12, 16, 'regular', 0],
});
assert.deepEqual(radius, { sm: 4, md: 8, lg: 16, full: 9999 });
assert.equal(color.doorBlueWash, 'rgba(163, 177, 211, 0.14)');
assert.equal(color.inkSoft, '#4C5677');
assert.equal(color.lineStrong, '#868B9E');
assert.equal(color.deepShade, '#5C6C97');
assert.equal(minTouchTarget, 44);
console.log('✓ established planner design tokens remain unchanged');

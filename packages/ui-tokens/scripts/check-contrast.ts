/** Fails if an approved pair drops below its minimum, or a forbidden pair starts passing. */
import { contrastRatio } from '../src/contrast.ts';
import { color, contrastPairs, forbiddenPairs } from '../src/tokens.ts';

let failed = false;

for (const { fg, bg, min, use } of contrastPairs) {
  const ratio = contrastRatio(color[fg], color[bg]);
  const ok = ratio >= min;
  if (!ok) failed = true;
  console.log(`${ok ? '✓' : '✗'} ${fg} on ${bg}: ${ratio.toFixed(2)} (min ${min}) · ${use}`);
}

for (const pair of forbiddenPairs) {
  const { fg, bg } = pair;
  const below = 'below' in pair ? pair.below : 3;
  const ratio = contrastRatio(color[fg], color[bg]);
  const stillFails = ratio < below;
  if (!stillFails) failed = true;
  console.log(
    `${stillFails ? '✓' : '✗'} forbidden ${fg} on ${bg}: ${ratio.toFixed(2)} (must stay under ${below})` +
      (stillFails ? '' : ' (now passes: review and move it to contrastPairs)'),
  );
}

if (failed) process.exit(1);

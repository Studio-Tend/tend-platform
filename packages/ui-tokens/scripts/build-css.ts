/**
 * Generates css/theme.css (Tailwind v4) and css/variables.css (plain CSS)
 * from src/tokens.ts.
 *
 *   node scripts/build-css.ts          write files
 *   node scripts/build-css.ts --check  fail if files are out of date (used in CI)
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  color,
  container,
  focusRing,
  fontFamily,
  fontWeight,
  motion,
  radius,
  spaceUnit,
  textStyle,
} from '../src/tokens.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const check = process.argv.includes('--check');

const kebab = (s: string) =>
  s.replace(/([a-z0-9])([A-Z])/g, '$1-$2').replace(/([a-z])([0-9])/g, '$1-$2').toLowerCase();
const rem = (px: number) => `${Number((px / 16).toFixed(4))}rem`;
const stack = (f: (typeof fontFamily)[keyof typeof fontFamily]) =>
  [`"${f.family}"`, ...f.fallback].join(', ');

/** Full stack, inlined so utilities work wherever next/font sets its variable. */
const webStack = (key: keyof typeof fontFamily) =>
  `var(${fontFamily[key].cssVariable}), ${stack(fontFamily[key])}`;

const header =
  '/* GENERATED from packages/ui-tokens/src/tokens.ts. Do not edit.\n' +
  '   Run: pnpm --filter @tend/ui-tokens css */\n';

function colorVars(indent: string): string[] {
  return Object.entries(color).map(([k, v]) => `${indent}--color-${kebab(k)}: ${v};`);
}

function textVars(indent: string): string[] {
  return Object.entries(textStyle).flatMap(([k, s]) => [
    `${indent}--text-${kebab(k)}: ${rem(s.size)};`,
    `${indent}--text-${kebab(k)}--line-height: ${rem(s.lineHeight)};`,
  ]);
}

function radiusVars(indent: string): string[] {
  return Object.entries(radius).map(
    ([k, v]) => `${indent}--radius-${k}: ${v >= 9999 ? 'calc(infinity * 1px)' : rem(v)};`,
  );
}

function typeUtilities(): string[] {
  return Object.entries(textStyle).flatMap(([k, s]) => {
    const lines = [
      `@utility type-${kebab(k)} {`,
      `  font-family: ${webStack(s.font)};`,
      `  font-size: var(--text-${kebab(k)});`,
      `  line-height: var(--text-${kebab(k)}--line-height);`,
      `  font-weight: ${fontWeight[s.weight]};`,
    ];
    if (s.tracking !== 0) lines.push(`  letter-spacing: ${s.tracking}em;`);
    if ('uppercase' in s && s.uppercase) lines.push('  text-transform: uppercase;');
    lines.push('}', '');
    return lines;
  });
}

const ring = `--color-${kebab(focusRing.color)}`;

const theme = [
  header,
  '/* Import after `@import "tailwindcss";`. Default palette, fonts,',
  '   type sizes and radii are removed so only Tend tokens exist. */',
  '',
  '@theme {',
  '  --color-*: initial;',
  ...colorVars('  '),
  '',
  '  --text-*: initial;',
  ...textVars('  '),
  '',
  '  --radius-*: initial;',
  ...radiusVars('  '),
  '',
  `  --spacing: ${rem(spaceUnit)};`,
  '',
  ...Object.entries(container).map(([k, v]) => `  --container-${k}: ${rem(v)};`),
  '',
  `  --ease-standard: ${motion.easing.standard};`,
  `  --default-transition-duration: ${motion.duration.fast}ms;`,
  '  --default-transition-timing-function: var(--ease-standard);',
  '}',
  '',
  '/* inline: resolves next/font variables wherever they are set (html or body). */',
  '@theme inline {',
  '  --font-*: initial;',
  ...Object.entries(fontFamily).map(
    ([k]) => `  --font-${k}: ${webStack(k as keyof typeof fontFamily)};`,
  ),
  '}',
  '',
  ...typeUtilities(),
  '@layer base {',
  '  html {',
  '    background-color: var(--color-cream);',
  '    color: var(--color-ink);',
  `    font-family: ${webStack('sans')};`,
  '    -webkit-font-smoothing: antialiased;',
  '  }',
  '',
  '  :focus-visible {',
  `    outline: ${focusRing.width}px solid var(${ring});`,
  `    outline-offset: ${focusRing.offset}px;`,
  '  }',
  '',
  '  @media (prefers-reduced-motion: reduce) {',
  '    *, *::before, *::after {',
  '      animation-duration: 0.01ms !important;',
  '      animation-iteration-count: 1 !important;',
  '      transition-duration: 0.01ms !important;',
  '      scroll-behavior: auto !important;',
  '    }',
  '  }',
  '}',
  '',
].join('\n');

const variables = [
  header,
  '/* Plain custom properties for non-Tailwind pages (e.g. the landing page). */',
  ':root {',
  ...colorVars('  '),
  '',
  ...Object.entries(fontFamily).map(([k, f]) => `  --font-${k}: ${stack(f)};`),
  '',
  ...textVars('  '),
  '',
  ...radiusVars('  '),
  '',
  `  --spacing: ${rem(spaceUnit)};`,
  ...Object.entries(container).map(([k, v]) => `  --container-${k}: ${rem(v)};`),
  `  --ease-standard: ${motion.easing.standard};`,
  `  --duration-fast: ${motion.duration.fast}ms;`,
  `  --duration-base: ${motion.duration.base}ms;`,
  '}',
  '',
].join('\n');

const outputs: Record<string, string> = {
  'css/theme.css': theme,
  'css/variables.css': variables,
};

let stale = false;
for (const [rel, content] of Object.entries(outputs)) {
  const path = join(root, rel);
  if (check) {
    let current = '';
    try {
      current = readFileSync(path, 'utf8');
    } catch {
      // missing file counts as stale
    }
    if (current !== content) {
      console.error(`✗ ${rel} is out of date. Run: pnpm --filter @tend/ui-tokens css`);
      stale = true;
    }
  } else {
    writeFileSync(path, content);
    console.log(`wrote ${rel}`);
  }
}

if (stale) process.exit(1);
if (check) console.log('✓ generated CSS is up to date');

// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { seedFocuses, seedRoomItems } from '@/components/tend-flow/seed-data';
import { decodePlanLink, encodePlanLink } from './plan-link';

const seedPlan = { focuses: seedFocuses(), roomItems: seedRoomItems() };

describe('plan link', () => {
  it('round-trips the seed plan exactly', async () => {
    const encoded = await encodePlanLink(seedPlan);
    expect(await decodePlanLink(encoded)).toEqual(seedPlan);
  });

  it('keeps the seed plan URL under 1,200 characters', async () => {
    const encoded = await encodePlanLink(seedPlan);
    expect(`https://www.heytend.co/plan/week#w=${encoded}`.length).toBeLessThan(1200);
  });

  it('returns null for garbage, truncated input, and an unknown version', async () => {
    const encoded = await encodePlanLink(seedPlan);
    expect(await decodePlanLink('not-valid')).toBeNull();
    expect(await decodePlanLink(encoded.slice(0, 8))).toBeNull();

    const payload = JSON.stringify({ v: 2, f: seedPlan.focuses, r: seedPlan.roomItems });
    const compressed = await new Response(
      new Blob([new TextEncoder().encode(payload)]).stream().pipeThrough(new CompressionStream('deflate-raw')),
    ).arrayBuffer();
    const binary = String.fromCharCode(...new Uint8Array(compressed));
    const v2 = btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
    expect(await decodePlanLink(v2)).toBeNull();
  });
});

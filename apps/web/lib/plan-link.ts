import { PlanLinkSchema, type PlanState } from '@tend/core';

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromBase64Url(encoded: string): Uint8Array | null {
  try {
    const padded = encoded.replace(/-/g, '+').replace(/_/g, '/');
    const pad = padded.length % 4 === 0 ? '' : '='.repeat(4 - (padded.length % 4));
    const binary = atob(padded + pad);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  } catch {
    return null;
  }
}

async function streamBytes(stream: ReadableStream<Uint8Array>): Promise<Uint8Array> {
  const buffer = await new Response(stream).arrayBuffer();
  return new Uint8Array(buffer);
}

function toBufferSource(bytes: Uint8Array): Uint8Array<ArrayBuffer> {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy;
}

async function pipeThrough(
  bytes: Uint8Array,
  transform: CompressionStream | DecompressionStream,
): Promise<Uint8Array> {
  const input = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(toBufferSource(bytes));
      controller.close();
    },
  });
  return streamBytes(input.pipeThrough(transform as ReadableWritablePair<Uint8Array, Uint8Array>));
}

async function deflateRaw(bytes: Uint8Array): Promise<Uint8Array> {
  return pipeThrough(bytes, new CompressionStream('deflate-raw'));
}

async function inflateRaw(bytes: Uint8Array): Promise<Uint8Array> {
  return pipeThrough(bytes, new DecompressionStream('deflate-raw'));
}

export async function encodePlanLink(plan: PlanState): Promise<string> {
  const payload = JSON.stringify({ v: 1, f: plan.focuses, r: plan.roomItems });
  const compressed = await deflateRaw(new TextEncoder().encode(payload));
  return toBase64Url(compressed);
}

export async function decodePlanLink(encoded: string): Promise<PlanState | null> {
  try {
    const bytes = fromBase64Url(encoded);
    if (!bytes) return null;
    const json = new TextDecoder().decode(await inflateRaw(bytes));
    const parsed = PlanLinkSchema.safeParse(JSON.parse(json) as unknown);
    if (!parsed.success) return null;
    return { focuses: parsed.data.f, roomItems: parsed.data.r };
  } catch {
    return null;
  }
}

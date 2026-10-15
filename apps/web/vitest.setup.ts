import { CompressionStream, DecompressionStream } from 'node:stream/web';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

if (typeof globalThis.CompressionStream === 'undefined') {
  globalThis.CompressionStream = CompressionStream as typeof globalThis.CompressionStream;
  globalThis.DecompressionStream = DecompressionStream as typeof globalThis.DecompressionStream;
}

afterEach(() => {
  cleanup();
});

vi.mock('@/lib/analytics', () => ({
  track: vi.fn(),
}));

vi.mock('@/lib/analytics.server', () => ({
  track: vi.fn(() => Promise.resolve()),
}));


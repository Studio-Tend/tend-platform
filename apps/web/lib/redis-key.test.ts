// @vitest-environment node
import { afterEach, describe, expect, it } from 'vitest';
import { redisKey } from './redis-key';

const original = process.env.REDIS_KEY_PREFIX;

afterEach(() => {
  if (original === undefined) delete process.env.REDIS_KEY_PREFIX;
  else process.env.REDIS_KEY_PREFIX = original;
});

describe('redisKey', () => {
  it('returns the key unchanged when the prefix is unset', () => {
    delete process.env.REDIS_KEY_PREFIX;
    expect(redisKey('send-week:ip')).toBe('send-week:ip');
  });

  it('returns the key unchanged when the prefix is blank', () => {
    process.env.REDIS_KEY_PREFIX = '   ';
    expect(redisKey('send-week:ip')).toBe('send-week:ip');
  });

  it('prefixes staging keys', () => {
    process.env.REDIS_KEY_PREFIX = 'staging';
    expect(redisKey('send-week:ip')).toBe('staging:send-week:ip');
  });

  it('does not add a second colon when the value already ends with one', () => {
    process.env.REDIS_KEY_PREFIX = 'staging:';
    expect(redisKey('send-week:ip')).toBe('staging:send-week:ip');
  });
});

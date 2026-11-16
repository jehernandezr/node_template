import { FixedClock } from '@platform/kernel/test-utils';
import { InvalidArgumentError } from '@platform/primitives';
import { InMemoryRateLimiter } from '../in-memory-rate-limiter.js';
import type { RateLimitRule } from '../rate-limit-rule.js';
import { runRateLimiterContract } from './utils/index.js';

const RULE: RateLimitRule = { name: 'evict', limit: 1, windowMs: 1000 };
const START = new Date('2025-01-01T00:00:00.000Z');

runRateLimiterContract(
  'InMemoryRateLimiter',
  (clock) => new InMemoryRateLimiter({ clock }),
);

describe('InMemoryRateLimiter', () => {
  it('forgets the least recently used key when it holds too many', async () => {
    const limiter = new InMemoryRateLimiter({
      clock: new FixedClock(START),
      maxEntries: 2,
    });
    await limiter.consume('first', RULE);
    await limiter.consume('second', RULE);
    await limiter.consume('third', RULE);
    await expect(limiter.peek('first', RULE)).resolves.toMatchObject({
      count: 0,
      allowed: true,
    });
    await expect(limiter.peek('third', RULE)).resolves.toMatchObject({
      count: 1,
      allowed: false,
    });
  });

  it('keeps counting a key that is used again before it is evicted', async () => {
    const limiter = new InMemoryRateLimiter({
      clock: new FixedClock(START),
      maxEntries: 2,
    });
    await limiter.consume('first', RULE);
    await limiter.consume('second', RULE);
    await limiter.consume('first', RULE);
    await limiter.consume('third', RULE);
    await expect(limiter.peek('first', RULE)).resolves.toMatchObject({
      count: 1,
    });
  });

  it('rejects a non-positive maxEntries', () => {
    expect(() => new InMemoryRateLimiter({ maxEntries: 0 })).toThrow(
      InvalidArgumentError,
    );
  });

  it('uses the system clock by default', async () => {
    const limiter = new InMemoryRateLimiter();
    await expect(
      limiter.consume('k', { name: 'sys', limit: 2, windowMs: 60_000 }),
    ).resolves.toMatchObject({
      allowed: true,
      count: 1,
    });
  });

  it('exposes the default number of entries', () => {
    expect(InMemoryRateLimiter.DEFAULT_MAX_ENTRIES).toBe(100_000);
  });

  it('treats a clock that goes backwards as the stored window', async () => {
    const clock = new FixedClock(START);
    const limiter = new InMemoryRateLimiter({ clock });
    clock.advance(5000);
    await limiter.consume('k', RULE);
    clock.set(START);
    await expect(limiter.peek('k', RULE)).resolves.toMatchObject({
      allowed: false,
      count: 1,
    });
  });

  it('starts a key over in a window more than one step later', async () => {
    const clock = new FixedClock(START);
    const limiter = new InMemoryRateLimiter({ clock });
    await limiter.consume('k', RULE);
    clock.advance(2500);
    await expect(limiter.peek('k', RULE)).resolves.toMatchObject({
      allowed: true,
      count: 0,
    });
  });
});

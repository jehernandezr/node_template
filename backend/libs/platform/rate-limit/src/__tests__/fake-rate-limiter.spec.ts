import { FixedClock } from '@platform/kernel/test-utils';
import { InvalidArgumentError } from '@platform/primitives';
import * as rateLimit from '../index.js';
import { RateLimitOperation, type RateLimitRule } from '../rate-limit-rule.js';
import { FakeRateLimiter } from './utils/fake-rate-limiter.js';
import * as testing from './utils/index.js';

const RULE: RateLimitRule = { name: 'otp', limit: 2, windowMs: 1_000 };

describe('testing entry point', () => {
  it('exports the fake only from @platform/rate-limit/test-utils', () => {
    expect(testing.FakeRateLimiter).toBe(FakeRateLimiter);
    expect('FakeRateLimiter' in rateLimit).toBe(false);
  });
});

describe('FakeRateLimiter', () => {
  it('counts like the in-memory limiter on its own clock', async () => {
    const clock = new FixedClock();
    const limiter = new FakeRateLimiter(clock);
    expect(limiter.clock).toBe(clock);
    await limiter.consume('k', RULE, 2);
    expect((await limiter.consume('k', RULE)).allowed).toBe(false);
    clock.advance(2_000);
    expect((await limiter.consume('k', RULE)).allowed).toBe(true);
    await limiter.reset('k', RULE);
    expect((await limiter.peek('k', RULE)).count).toBe(0);
  });

  it('records every valid call in order', async () => {
    const limiter = new FakeRateLimiter();
    await limiter.consume('a', RULE, 2);
    await limiter.peek('b', RULE);
    await limiter.reset('a', RULE);
    expect(limiter.calls).toEqual([
      { operation: RateLimitOperation.Consume, key: 'a', rule: RULE, cost: 2 },
      { operation: RateLimitOperation.Peek, key: 'b', rule: RULE, cost: 1 },
      { operation: RateLimitOperation.Reset, key: 'a', rule: RULE, cost: 1 },
    ]);
    expect(limiter.callsOf(RateLimitOperation.Peek)).toHaveLength(1);
  });

  it('rejects a blocked key until it is unblocked', async () => {
    const limiter = new FakeRateLimiter();
    limiter.block('k');
    expect(await limiter.consume('k', RULE)).toEqual({
      allowed: false,
      count: 2,
      remaining: 0,
      retryAfterMs: 1_000,
    });
    expect((await limiter.peek('k', RULE)).allowed).toBe(false);
    expect((await limiter.consume('other', RULE)).allowed).toBe(true);
    limiter.unblock('k');
    expect((await limiter.consume('k', RULE)).allowed).toBe(true);
  });

  it('fails every call while a failure is set', async () => {
    const limiter = new FakeRateLimiter();
    const outage = new Error('down');
    limiter.failWith(outage);
    await expect(limiter.consume('k', RULE)).rejects.toBe(outage);
    await expect(limiter.peek('k', RULE)).rejects.toBe(outage);
    await expect(limiter.reset('k', RULE)).rejects.toBe(outage);
    expect(limiter.calls).toHaveLength(3);
    limiter.failWith();
    expect((await limiter.consume('k', RULE)).allowed).toBe(true);
  });

  it('validates like a real limiter and does not record invalid calls', async () => {
    const limiter = new FakeRateLimiter();
    await expect(limiter.consume('k', RULE, 3)).rejects.toBeInstanceOf(
      InvalidArgumentError,
    );
    expect(limiter.calls).toHaveLength(0);
  });
});

import { FixedClock } from '@platform/kernel/test-utils';
import { RateLimitOperation } from '../rate-limit-operation.enum.js';
import type { RateLimitRule } from '../rate-limit-rule.js';
import { FakeRateLimiter, runRateLimiterContract } from './utils/index.js';

const RULE: RateLimitRule = { name: 'fake', limit: 2, windowMs: 1000 };

runRateLimiterContract(
  'FakeRateLimiter',
  (clock) => new FakeRateLimiter(clock),
);

describe('FakeRateLimiter', () => {
  it('records each operation with its cost', async () => {
    const limiter = new FakeRateLimiter(new FixedClock());
    await limiter.consume('k', RULE, 2);
    await limiter.peek('k', RULE);
    await limiter.reset('k', RULE);
    expect(limiter.calls.map((call) => [call.operation, call.cost])).toEqual([
      [RateLimitOperation.Consume, 2],
      [RateLimitOperation.Peek, 1],
      [RateLimitOperation.Reset, 1],
    ]);
    expect(limiter.callsOf(RateLimitOperation.Consume)).toHaveLength(1);
  });

  it('rejects a blocked key until it is unblocked', async () => {
    const limiter = new FakeRateLimiter(new FixedClock());
    limiter.block('k');
    await expect(limiter.consume('k', RULE)).resolves.toEqual({
      allowed: false,
      count: 2,
      remaining: 0,
      retryAfterMs: 1000,
    });
    await expect(limiter.peek('k', RULE)).resolves.toMatchObject({
      allowed: false,
    });
    limiter.unblock('k');
    await expect(limiter.consume('k', RULE)).resolves.toMatchObject({
      allowed: true,
    });
  });

  it('throws the configured failure on every call until cleared', async () => {
    const limiter = new FakeRateLimiter(new FixedClock());
    const failure = new Error('valkey down');
    limiter.failWith(failure);
    await expect(limiter.consume('k', RULE)).rejects.toBe(failure);
    await expect(limiter.peek('k', RULE)).rejects.toBe(failure);
    await expect(limiter.reset('k', RULE)).rejects.toBe(failure);
    limiter.failWith();
    await expect(limiter.consume('k', RULE)).resolves.toMatchObject({
      allowed: true,
    });
  });

  it('does not record invalid calls', async () => {
    const limiter = new FakeRateLimiter(new FixedClock());
    await expect(limiter.consume('', RULE)).rejects.toThrow();
    expect(limiter.calls).toHaveLength(0);
  });

  it('uses a fixed clock by default', () => {
    expect(new FakeRateLimiter().clock.now().toISOString()).toBe(
      '2025-01-01T00:00:00.000Z',
    );
  });
});

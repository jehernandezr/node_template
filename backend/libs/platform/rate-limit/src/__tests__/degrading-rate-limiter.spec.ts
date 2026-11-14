import { FixedClock } from '@platform/kernel/test-utils';
import { InvalidArgumentError } from '@platform/primitives';
import { DegradingRateLimiter } from '../degrading-rate-limiter.js';
import { RateLimitOperation } from '../rate-limit-operation.enum.js';
import type { RateLimitRule } from '../rate-limit-rule.js';
import {
  FakeRateLimiter,
  RecordingDegradationReporter,
} from './utils/index.js';

const RULE: RateLimitRule = { name: 'degrade', limit: 4, windowMs: 1000 };
const START = new Date('2025-01-01T00:00:00.000Z');
const DOWN = new Error('valkey down');

function setup(): { primary: FakeRateLimiter; limiter: DegradingRateLimiter } {
  const clock = new FixedClock(START);
  const primary = new FakeRateLimiter(clock);
  const limiter = new DegradingRateLimiter({ primary, localDivisor: 2, clock });
  return { primary, limiter };
}

describe('DegradingRateLimiter', () => {
  it('answers from the shared limiter while it works', async () => {
    const { primary, limiter } = setup();
    await expect(limiter.consume('k', RULE)).resolves.toMatchObject({
      count: 1,
    });
    expect(primary.callsOf(RateLimitOperation.Consume)).toHaveLength(1);
  });

  it('answers from the local limiter with the divided limit when the shared one fails', async () => {
    const { primary, limiter } = setup();
    primary.failWith(DOWN);
    await expect(limiter.consume('k', RULE)).resolves.toMatchObject({
      allowed: true,
      count: 1,
    });
    await expect(limiter.consume('k', RULE)).resolves.toMatchObject({
      allowed: true,
      count: 2,
    });
    await expect(limiter.consume('k', RULE)).resolves.toMatchObject({
      allowed: false,
      count: 2,
    });
  });

  it('caps a cost at the local limit', async () => {
    const { primary, limiter } = setup();
    primary.failWith(DOWN);
    await expect(limiter.consume('k', RULE, 3)).resolves.toMatchObject({
      allowed: true,
      count: 2,
    });
  });

  it('answers peek from the local limiter when the shared one fails', async () => {
    const { primary, limiter } = setup();
    primary.failWith(DOWN);
    await expect(limiter.peek('k', RULE)).resolves.toEqual({
      allowed: true,
      count: 0,
      remaining: 2,
      retryAfterMs: 0,
    });
  });

  it('reports each failure to the listener and the reporter', async () => {
    const { primary } = setup();
    const reporter = new RecordingDegradationReporter();
    const seen: RateLimitOperation[] = [];
    const limiter = new DegradingRateLimiter({
      primary,
      localDivisor: 1,
      reporter,
      onDegraded: (operation) => {
        seen.push(operation);
      },
    });
    primary.failWith(DOWN);
    await limiter.consume('k', RULE);
    await limiter.peek('k', RULE);
    await limiter.reset('k', RULE);
    expect(seen).toEqual([
      RateLimitOperation.Consume,
      RateLimitOperation.Peek,
      RateLimitOperation.Reset,
    ]);
    expect(reporter.degradations.map((entry) => entry.operation)).toEqual(seen);
    expect(reporter.degradations[0]).toMatchObject({ rule: RULE, error: DOWN });
  });

  it('does not fail reset when the shared limiter is down', async () => {
    const { primary, limiter } = setup();
    primary.failWith(DOWN);
    await expect(limiter.reset('k', RULE)).resolves.toBeUndefined();
  });

  it('keeps answering when the listener or the reporter throws', async () => {
    const { primary } = setup();
    const throwing = new (class extends RecordingDegradationReporter {
      override degraded(): void {
        throw new Error('reporter broke');
      }
    })();
    const limiter = new DegradingRateLimiter({
      primary,
      localDivisor: 1,
      reporter: throwing,
      onDegraded: () => {
        throw new Error('listener broke');
      },
    });
    primary.failWith(DOWN);
    await expect(limiter.consume('k', RULE)).resolves.toMatchObject({
      allowed: true,
    });
  });

  it('uses a provided fallback limiter', async () => {
    const primary = new FakeRateLimiter(new FixedClock(START));
    const fallback = new FakeRateLimiter(new FixedClock(START));
    const limiter = new DegradingRateLimiter({
      primary,
      localDivisor: 1,
      fallback,
    });
    primary.failWith(DOWN);
    await limiter.consume('k', RULE);
    expect(fallback.callsOf(RateLimitOperation.Consume)).toHaveLength(1);
  });

  it('uses the system clock when no fallback or clock is given', async () => {
    const primary = new FakeRateLimiter(new FixedClock(START));
    const limiter = new DegradingRateLimiter({ primary, localDivisor: 1 });
    primary.failWith(DOWN);
    await expect(limiter.consume('k', RULE)).resolves.toMatchObject({
      allowed: true,
    });
  });

  it.each([0, 1.5, -2])('rejects localDivisor %p', (localDivisor) => {
    expect(
      () =>
        new DegradingRateLimiter({
          primary: new FakeRateLimiter(),
          localDivisor,
        }),
    ).toThrow(InvalidArgumentError);
  });
});

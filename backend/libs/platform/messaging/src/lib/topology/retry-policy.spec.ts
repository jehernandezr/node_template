import { BackoffStrategy, PrimitivesErrorCode } from '@platform/primitives';
import { MessagingErrorCode } from '../errors/messaging-error.js';
import {
  RetryPolicy,
  backoffDelayMs,
  messagingBackoffDelay,
  toSharedBackoff,
} from './retry-policy.js';

describe('backoffDelayMs', () => {
  const base = { baseMs: 100, maxMs: 1_000 };

  it('doubles the delay per attempt without jitter and caps at maxMs', () => {
    expect(
      [1, 2, 3, 4, 5, 6].map((attempt) =>
        backoffDelayMs(attempt, { ...base, jitter: false }),
      ),
    ).toEqual([100, 200, 400, 800, 1_000, 1_000]);
  });

  it('stays within [0, ceiling] with full jitter', () => {
    for (let attempt = 1; attempt <= 12; attempt++) {
      const ceiling = Math.min(base.maxMs, base.baseMs * 2 ** (attempt - 1));
      const low = backoffDelayMs(attempt, {
        ...base,
        jitter: true,
        random: () => 0,
      });
      const high = backoffDelayMs(attempt, {
        ...base,
        jitter: true,
        random: () => 0.999999,
      });
      expect(low).toBe(0);
      expect(high).toBeGreaterThanOrEqual(0);
      expect(high).toBeLessThanOrEqual(ceiling);
    }
  });

  it('never overflows for very large attempts', () => {
    expect(backoffDelayMs(5_000, { ...base, jitter: false })).toBe(base.maxMs);
  });

  it('rejects attempts below 1', () => {
    expect(() => backoffDelayMs(0, base)).toThrow(
      expect.objectContaining({ code: PrimitivesErrorCode.InvalidArgument }),
    );
  });
});

describe('shared backoff', () => {
  it('maps the deprecated shape to the primitives strategy', () => {
    expect(toSharedBackoff({ baseMs: 1, maxMs: 2 })).toEqual({
      strategy: BackoffStrategy.None,
      baseMs: 1,
      maxMs: 2,
    });
    expect(toSharedBackoff({ baseMs: 1, maxMs: 2, jitter: true })).toEqual({
      strategy: BackoffStrategy.FullJitter,
      baseMs: 1,
      maxMs: 2,
    });
    const shared = {
      strategy: BackoffStrategy.EqualJitter,
      baseMs: 1,
      maxMs: 2,
    };
    expect(toSharedBackoff(shared)).toBe(shared);
  });

  it('accepts the primitives options directly', () => {
    expect(
      messagingBackoffDelay(3, {
        strategy: BackoffStrategy.None,
        baseMs: 100,
        maxMs: 10_000,
        factor: 3,
      }),
    ).toBe(900);
  });

  it('exposes the policy curve as primitives options', () => {
    const policy = RetryPolicy.exponential({
      maxAttempts: 3,
      baseMs: 100,
      maxMs: 1_000,
      jitter: false,
    });
    expect(policy.backoff()).toEqual({
      strategy: BackoffStrategy.None,
      baseMs: 100,
      maxMs: 1_000,
    });
    expect(policy.delayMs(5_000)).toBe(1_000);
  });
});

describe('RetryPolicy.exponential', () => {
  it('exposes its settings and defaults jitter to true', () => {
    const policy = RetryPolicy.exponential({
      maxAttempts: 6,
      baseMs: 2_000,
      maxMs: 600_000,
    });
    expect(policy).toMatchObject({
      maxAttempts: 6,
      baseMs: 2_000,
      maxMs: 600_000,
      jitter: true,
    });
    expect(policy.delayMs(1, () => 0.5)).toBe(1_000);
  });

  it.each([
    ['maxAttempts', { maxAttempts: 0, baseMs: 1, maxMs: 2 }],
    ['baseMs', { maxAttempts: 3, baseMs: 0, maxMs: 2 }],
    ['maxMs', { maxAttempts: 3, baseMs: 10, maxMs: 5 }],
  ])('rejects invalid %s', (_label, options) => {
    expect(() => RetryPolicy.exponential(options)).toThrow(
      expect.objectContaining({ code: MessagingErrorCode.InvalidRetryPolicy }),
    );
  });
});

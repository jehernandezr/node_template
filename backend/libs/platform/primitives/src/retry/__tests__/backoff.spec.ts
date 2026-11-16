import { FixedRandomSource } from '@platform/kernel/test-utils';
import { InvalidArgumentError } from '../../errors/invalid-argument.error.js';
import { Backoff } from '../backoff.js';
import { BackoffStrategy } from '../backoff-strategy.enum.js';
import { RetryPolicy } from '../retry-policy.js';

function backoff(
  strategy: BackoffStrategy,
  random = 0.5,
  baseMs = 100,
  maxMs = 1000,
): Backoff {
  return new Backoff(
    new RetryPolicy(5, baseMs, maxMs, strategy),
    new FixedRandomSource([random]),
  );
}

describe('Backoff', () => {
  it.each([
    [1, 100],
    [2, 200],
    [3, 400],
    [4, 800],
    [5, 1000],
    [1000, 1000],
  ])('None: attempt %d waits %d', (attempt, expected) => {
    expect(backoff(BackoffStrategy.None).delay(attempt)).toBe(expected);
  });

  it.each([
    [0, 0],
    [0.5, 100],
    [0.999, 199],
  ])('FullJitter with random %d on attempt 2', (random, expected) => {
    expect(backoff(BackoffStrategy.FullJitter, random).delay(2)).toBe(expected);
  });

  it.each([
    [0, 100],
    [0.5, 150],
  ])('EqualJitter with random %d on attempt 2', (random, expected) => {
    expect(backoff(BackoffStrategy.EqualJitter, random).delay(2)).toBe(
      expected,
    );
  });

  it.each([-1, NaN, Infinity, 5])(
    'keeps an out-of-range random source (%d) within bounds',
    (random) => {
      const delay = backoff(BackoffStrategy.FullJitter, random).delay(3);
      expect(delay).toBeGreaterThanOrEqual(0);
      expect(delay).toBeLessThanOrEqual(400);
    },
  );

  it('waits nothing when baseMs is 0', () => {
    expect(backoff(BackoffStrategy.None, 0.5, 0, 0).delay(3)).toBe(0);
  });

  it('is capped by maxMs when the exponent overflows', () => {
    expect(backoff(BackoffStrategy.None, 0.5, 100, 1000).delay(1000)).toBe(
      1000,
    );
  });

  it.each([0, -1, 1.5, 1001, NaN])('rejects attempt %d', (attempt) => {
    expect(() => backoff(BackoffStrategy.None).delay(attempt)).toThrow(
      InvalidArgumentError,
    );
  });
});

import { InvalidArgumentError } from '../../errors/invalid-argument.error.js';
import { BackoffStrategy } from '../backoff-strategy.enum.js';
import { RetryPolicy } from '../retry-policy.js';

describe('RetryPolicy', () => {
  it('keeps its values and defaults the factor to 2', () => {
    const policy = new RetryPolicy(3, 100, 1000, BackoffStrategy.FullJitter);
    expect(policy).toMatchObject({
      maxAttempts: 3,
      baseMs: 100,
      maxMs: 1000,
      strategy: BackoffStrategy.FullJitter,
      factor: 2,
    });
  });

  it('has a single-attempt policy', () => {
    expect(RetryPolicy.none.maxAttempts).toBe(1);
    expect(RetryPolicy.none.strategy).toBe(BackoffStrategy.None);
  });

  it.each([
    ['maxAttempts 0', () => new RetryPolicy(0, 1, 2, BackoffStrategy.None)],
    ['maxAttempts 1.5', () => new RetryPolicy(1.5, 1, 2, BackoffStrategy.None)],
    ['negative baseMs', () => new RetryPolicy(1, -1, 2, BackoffStrategy.None)],
    [
      'infinite maxMs',
      () => new RetryPolicy(1, 1, Infinity, BackoffStrategy.None),
    ],
    [
      'maxMs below baseMs',
      () => new RetryPolicy(1, 5, 2, BackoffStrategy.None),
    ],
    [
      'unknown strategy',
      () => new RetryPolicy(1, 1, 2, 'x' as BackoffStrategy),
    ],
    [
      'factor below 1',
      () => new RetryPolicy(1, 1, 2, BackoffStrategy.None, 0.5),
    ],
    ['NaN factor', () => new RetryPolicy(1, 1, 2, BackoffStrategy.None, NaN)],
  ])('rejects %s', (_label, build) => {
    expect(build).toThrow(InvalidArgumentError);
  });
});

import { InvalidArgumentError } from '../errors/invalid-argument.error.js';
import { PrimitivesGuard } from '../errors/primitives-guard.js';
import { BackoffStrategy } from './backoff-strategy.enum.js';

/**
 * Single retry policy of the platform: how many attempts and how the wait
 * grows between them. Internal-api, messaging and resilience reuse it instead
 * of declaring their own. Validates on construction.
 */
export class RetryPolicy {
  /** A single attempt, with no retries. */
  static readonly none = new RetryPolicy(1, 0, 0, BackoffStrategy.None);

  /**
   * @param maxAttempts Total attempts, including the first. Positive integer.
   * @param baseMs Wait of the first retry. Finite and non-negative.
   * @param maxMs Cap of the wait. Greater than or equal to `baseMs`.
   * @param strategy How the wait is distributed within the ceiling.
   * @param factor Multiplier between attempts. Finite and greater than or equal to 1.
   */
  constructor(
    readonly maxAttempts: number,
    readonly baseMs: number,
    readonly maxMs: number,
    readonly strategy: BackoffStrategy,
    readonly factor = 2,
  ) {
    const guard = PrimitivesGuard.instance;
    guard.positiveInteger('maxAttempts', maxAttempts);
    if (!Object.values(BackoffStrategy).includes(strategy)) {
      throw new InvalidArgumentError('strategy', 'a BackoffStrategy value');
    }
    guard.nonNegativeFinite('baseMs', baseMs);
    guard.nonNegativeFinite('maxMs', maxMs);
    if (maxMs < baseMs) {
      throw new InvalidArgumentError(
        'maxMs',
        'greater than or equal to baseMs',
      );
    }
    if (!Number.isFinite(factor) || factor < 1) {
      throw new InvalidArgumentError('factor', 'a finite number >= 1');
    }
  }
}

import type { RandomSource } from '@platform/kernel';
import { PrimitivesGuard } from '../errors/primitives-guard.js';
import { BackoffStrategy } from './backoff-strategy.enum.js';
import type { RetryPolicy } from './retry-policy.js';

/** Computes the wait before each retry according to a `RetryPolicy`. */
export class Backoff {
  /** Maximum accepted attempt number; prevents endless retry loops by mistake. */
  static readonly MAX_ATTEMPT = 1_000;

  constructor(
    readonly policy: RetryPolicy,
    private readonly random: RandomSource,
  ) {}

  /**
   * Returns the wait, in whole milliseconds, before retry number `attempt` (the
   * first is 1). It never exceeds `policy.maxMs` and is never negative.
   */
  delay(attempt: number): number {
    PrimitivesGuard.instance.integerInRange(
      'attempt',
      attempt,
      1,
      Backoff.MAX_ATTEMPT,
    );
    const { baseMs, maxMs, factor, strategy } = this.policy;
    const exponential = baseMs * factor ** (attempt - 1);
    // `baseMs = 0` gives 0; a huge exponent gives Infinity and `maxMs` caps it.
    const ceiling = Math.min(
      maxMs,
      Number.isNaN(exponential) ? 0 : exponential,
    );

    switch (strategy) {
      case BackoffStrategy.None:
        return Math.floor(ceiling);
      case BackoffStrategy.FullJitter:
        return Math.floor(ceiling * this.unit());
      case BackoffStrategy.EqualJitter: {
        const half = ceiling / 2;
        return Math.floor(half + half * this.unit());
      }
    }
  }

  /** Random value bounded to `[0, 1)`, even if the injected source goes out of range. */
  private unit(): number {
    const value = this.random.next();
    if (!Number.isFinite(value) || value <= 0) {
      return 0;
    }
    return value >= 1 ? 1 - Number.EPSILON : value;
  }
}

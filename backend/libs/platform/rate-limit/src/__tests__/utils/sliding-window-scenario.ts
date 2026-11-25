import type { FixedClock } from '@platform/kernel/test-utils';
import type { RateLimitResult } from '../../rate-limit-result.js';

/** A step of the sequence: advance the clock and request `cost` units. */
export interface SlidingWindowStep {
  readonly advanceMs: number;
  readonly cost: number;
}

/** Fixed sequence of consumptions with clock advances, reproducible on any limiter. */
export class SlidingWindowScenario {
  constructor(private readonly steps: readonly SlidingWindowStep[]) {}

  /** Runs each step in order and returns the response of each one. */
  async run(
    consume: (cost: number) => Promise<RateLimitResult> | RateLimitResult,
    clock: FixedClock,
  ): Promise<RateLimitResult[]> {
    const results: RateLimitResult[] = [];
    for (const step of this.steps) {
      clock.advance(step.advanceMs);
      results.push(await consume(step.cost));
    }
    return results;
  }
}

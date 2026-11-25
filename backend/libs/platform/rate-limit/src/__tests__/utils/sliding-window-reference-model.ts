import type { FixedClock } from '@platform/kernel/test-utils';
import type { RateLimitResult } from '../../rate-limit-result.js';
import type { RateLimitRule } from '../../rate-limit-rule.js';
import { SlidingWindow } from '../../sliding-window.js';
import type { WindowCounts } from '../../window-counts.js';

/** State of the key in its current fixed window. */
interface ModelState {
  readonly index: number;
  readonly previous: number;
  readonly current: number;
}

/**
 * Reference model of a key with the same semantics as the in-memory
 * limiter, written only with the `SlidingWindow` functions.
 */
export class SlidingWindowReferenceModel {
  private state: ModelState | undefined;

  constructor(
    private readonly rule: RateLimitRule,
    private readonly clock: FixedClock,
  ) {}

  consume(cost: number): RateLimitResult {
    const position = SlidingWindow.position(
      this.clock.now().getTime(),
      this.rule.windowMs,
    );
    const counts = this.countsAt(position.index);
    const allowed = SlidingWindow.admits(counts, position, this.rule, cost);
    this.state = {
      index: position.index,
      previous: counts.previous,
      current: counts.current + (allowed ? cost : 0),
    };
    return SlidingWindow.result(this.state, position, this.rule, allowed, cost);
  }

  private countsAt(index: number): WindowCounts {
    if (this.state === undefined) {
      return { previous: 0, current: 0 };
    }
    if (this.state.index === index) {
      return { previous: this.state.previous, current: this.state.current };
    }
    const previous = this.state.index === index - 1 ? this.state.current : 0;
    return { previous, current: 0 };
  }
}

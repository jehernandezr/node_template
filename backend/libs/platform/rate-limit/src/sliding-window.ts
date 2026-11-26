import type { RateLimitResult } from './rate-limit-result.js';
import type { RateLimitRule } from './rate-limit-rule.js';
import type { WindowCounts } from './window-counts.js';
import type { WindowPosition } from './window-position.js';

/**
 * Sliding window arithmetic. Everything is static and stateless.
 * Approximate sliding window with two fixed windows: what was counted in the previous window weighs in proportion to the part of it that still falls inside the sliding window. estimate = previous * (W - elapsed) / W + current The counts are multiplied by W to work only with integers. With the rule caps (limit of 10^6 and window of 30 days) all the products stay below 2^53, so the decision is exact here and in the Valkey Lua script, which repeats it.
 */
export class SlidingWindow {
  /** Fixed window that `nowMs` falls in, with integer epoch milliseconds. */
  static position(nowMs: number, windowMs: number): WindowPosition {
    const index = Math.floor(nowMs / windowMs);
    return { index, elapsedMs: nowMs - index * windowMs };
  }

  /** Whether `cost` more units fit in the rule's limit. */
  static admits(
    counts: WindowCounts,
    position: WindowPosition,
    rule: RateLimitRule,
    cost: number,
  ): boolean {
    return (
      SlidingWindow.scaledEstimate(counts, position, rule.windowMs) +
        cost * rule.windowMs <=
      rule.limit * rule.windowMs
    );
  }

  /**
   * Response for the counts at an instant.
   * @param counts Counts after counting, if the operation was accepted.
   * @param cost Cost used to compute the wait if it was rejected.
   */
  static result(
    counts: WindowCounts,
    position: WindowPosition,
    rule: RateLimitRule,
    allowed: boolean,
    cost: number,
  ): RateLimitResult {
    const count = SlidingWindow.ceilDiv(
      SlidingWindow.scaledEstimate(counts, position, rule.windowMs),
      rule.windowMs,
    );
    return {
      allowed,
      count,
      remaining: Math.max(0, rule.limit - count),
      retryAfterMs: allowed
        ? 0
        : SlidingWindow.waitMs(counts, position, rule, cost),
    };
  }

  /** Integer part of `a / b` for non-negative integers, without rounding error. */
  private static floorDiv(a: number, b: number): number {
    let quotient = Math.floor(a / b);
    if (quotient * b > a) {
      quotient -= 1;
    } else if ((quotient + 1) * b <= a) {
      quotient += 1;
    }
    return quotient;
  }

  private static ceilDiv(a: number, b: number): number {
    const quotient = SlidingWindow.floorDiv(a, b);
    return quotient * b === a ? quotient : quotient + 1;
  }

  /** Sliding window estimate multiplied by W. */
  private static scaledEstimate(
    counts: WindowCounts,
    position: WindowPosition,
    windowMs: number,
  ): number {
    return (
      counts.previous * (windowMs - position.elapsedMs) +
      counts.current * windowMs
    );
  }

  /**
   * Minimum wait for `cost` units to fit if no more traffic arrives.
   * Only meaningful when they do not fit now.
   * It fits in this same window once the previous one weighs enough less.
   * It must wait for the next window, where the current one becomes the previous one.
   */
  private static waitMs(
    counts: WindowCounts,
    position: WindowPosition,
    rule: RateLimitRule,
    cost: number,
  ): number {
    const windowMs = rule.windowMs;
    const room = rule.limit - cost - counts.current;
    if (room >= 0) {
      return (
        windowMs -
        SlidingWindow.floorDiv(room * windowMs, counts.previous) -
        position.elapsedMs
      );
    }
    return (
      windowMs -
      position.elapsedMs +
      windowMs -
      SlidingWindow.floorDiv((rule.limit - cost) * windowMs, counts.current)
    );
  }
}

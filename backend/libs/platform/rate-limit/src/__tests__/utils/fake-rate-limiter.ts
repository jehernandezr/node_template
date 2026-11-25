import type { Clock } from '@platform/kernel';
import { FixedClock } from '@platform/kernel/test-utils';
import { InMemoryRateLimiter } from '../../in-memory-rate-limiter.js';
import { RateLimitOperation } from '../../rate-limit-operation.enum.js';
import type { RateLimitResult } from '../../rate-limit-result.js';
import type { RateLimitRule } from '../../rate-limit-rule.js';
import { RateLimitCallValidator } from '../../rate-limit-call-validator.js';
import { RateLimiter } from '../../rate-limiter.js';

/** A call received by a {@link FakeRateLimiter}. */
export interface RateLimiterCall {
  readonly operation: RateLimitOperation;
  readonly key: string;
  readonly rule: RateLimitRule;
  /** Cost of `consume`; 1 in `peek` and `reset`. */
  readonly cost: number;
}

/**
 * {@link RateLimiter} for tests. Counts like `InMemoryRateLimiter` over a
 * test clock, stores each call and allows forcing rejections or failures.
 */
export class FakeRateLimiter extends RateLimiter {
  /** Calls received, in order. Invalid ones are not stored. */
  readonly calls: RateLimiterCall[] = [];
  /** Clock of the counters, to advance time from the test. */
  readonly clock: Clock;
  private readonly inner: InMemoryRateLimiter;
  private readonly blocked = new Set<string>();
  private failure: { error: unknown } | undefined;

  constructor(clock: Clock = new FixedClock()) {
    super();
    this.clock = clock;
    this.inner = new InMemoryRateLimiter({ clock });
  }

  /** Rejects every `consume` and `peek` of the key, in any rule. */
  block(key: string): void {
    this.blocked.add(key);
  }

  unblock(key: string): void {
    this.blocked.delete(key);
  }

  /**
   * Makes every valid call throw `error`, like a Valkey that is down. Without
   * an argument it responds normally again.
   */
  failWith(error?: unknown): void {
    this.failure = error === undefined ? undefined : { error };
  }

  /** Calls of one operation. */
  callsOf(operation: RateLimitOperation): RateLimiterCall[] {
    return this.calls.filter((call) => call.operation === operation);
  }

  async consume(
    key: string,
    rule: RateLimitRule,
    cost = 1,
  ): Promise<RateLimitResult> {
    this.record(RateLimitOperation.Consume, key, rule, cost);
    return this.blocked.has(key)
      ? blockedResult(rule)
      : this.inner.consume(key, rule, cost);
  }

  async peek(key: string, rule: RateLimitRule): Promise<RateLimitResult> {
    this.record(RateLimitOperation.Peek, key, rule, 1);
    return this.blocked.has(key)
      ? blockedResult(rule)
      : this.inner.peek(key, rule);
  }

  async reset(key: string, rule: RateLimitRule): Promise<void> {
    this.record(RateLimitOperation.Reset, key, rule, 1);
    await this.inner.reset(key, rule);
  }

  private record(
    operation: RateLimitOperation,
    key: string,
    rule: RateLimitRule,
    cost: number,
  ): void {
    RateLimitCallValidator.validate(key, rule, cost);
    this.calls.push({ operation, key, rule, cost });
    if (this.failure !== undefined) {
      throw this.failure.error;
    }
  }
}

/** Response for a blocked key: no room for an entire window. */
function blockedResult(rule: RateLimitRule): RateLimitResult {
  return {
    allowed: false,
    count: rule.limit,
    remaining: 0,
    retryAfterMs: rule.windowMs,
  };
}

import { PrimitivesGuard } from '@platform/primitives';
import type { DegradingRateLimiterOptions } from './degrading-rate-limiter.options.js';
import type { RateLimitDegradationReporter } from './rate-limit-degradation-reporter.js';
import type { RateLimitDegradedListener } from './rate-limit-degraded-listener.js';
import { RateLimitOperation } from './rate-limit-operation.enum.js';
import type { RateLimitResult } from './rate-limit-result.js';
import type { RateLimitRule } from './rate-limit-rule.js';
import { RateLimitCallValidator } from './rate-limit-call-validator.js';
import { RateLimiter } from './rate-limiter.js';

/**
 * {@link RateLimiter} that uses the shared limiter and, if it fails, a
 * local one with the limit divided by `localDivisor`. A service without Valkey
 * keeps limiting, more loosely, instead of rejecting everything or not limiting.
 *
 * Any failure of the shared one degrades, because the arguments were already
 * validated before calling it. To avoid waiting for the timeout of each
 * call while Valkey is down, `primary` should go through a
 * circuit breaker.
 */
export class DegradingRateLimiter extends RateLimiter {
  private readonly primary: RateLimiter;
  private readonly fallback: RateLimiter;
  private readonly localDivisor: number;
  private readonly onDegraded: RateLimitDegradedListener | undefined;
  private readonly reporter: RateLimitDegradationReporter;

  /** @throws InvalidArgumentError if `localDivisor` is not a positive integer. */
  constructor(options: DegradingRateLimiterOptions) {
    super();
    this.localDivisor = PrimitivesGuard.instance.positiveInteger(
      'localDivisor',
      options.localDivisor,
    );
    this.primary = options.primary;
    this.fallback = options.fallback;
    this.onDegraded = options.onDegraded;
    this.reporter = options.reporter;
  }

  /**
   * Consumes from the shared limiter, or from the local one with the divided limit if it fails.
   * A cost that the local limit does not admit would never fit: it is clamped.
   */
  async consume(
    key: string,
    rule: RateLimitRule,
    cost = 1,
  ): Promise<RateLimitResult> {
    RateLimitCallValidator.validate(key, rule, cost);
    try {
      return await this.primary.consume(key, rule, cost);
    } catch (error) {
      this.degraded(RateLimitOperation.Consume, rule, error);
      const local = this.localRule(rule);
      return this.fallback.consume(key, local, Math.min(cost, local.limit));
    }
  }

  /** Reads the shared limiter's state, or the local one's if it fails. */
  async peek(key: string, rule: RateLimitRule): Promise<RateLimitResult> {
    RateLimitCallValidator.validate(key, rule);
    try {
      return await this.primary.peek(key, rule);
    } catch (error) {
      this.degraded(RateLimitOperation.Peek, rule, error);
      return this.fallback.peek(key, this.localRule(rule));
    }
  }

  /**
   * Deletes in both limiters. If the shared one fails it only warns: whoever
   * resets (for example, after a successful login) must not fail
   * because of it, and the old counter expires on its own with its window.
   */
  async reset(key: string, rule: RateLimitRule): Promise<void> {
    RateLimitCallValidator.validate(key, rule);
    await this.fallback.reset(key, this.localRule(rule));
    try {
      await this.primary.reset(key, rule);
    } catch (error) {
      this.degraded(RateLimitOperation.Reset, rule, error);
    }
  }

  /** The rule that the local limiter applies. Keeps name and window. */
  private localRule(rule: RateLimitRule): RateLimitRule {
    return {
      name: rule.name,
      windowMs: rule.windowMs,
      limit: Math.max(1, Math.floor(rule.limit / this.localDivisor)),
    };
  }

  /**
   * The warning is diagnostic: it must not change the limiter's response.
   * The report is diagnostic: it must not change the limiter's response.
   */
  private degraded(
    operation: RateLimitOperation,
    rule: RateLimitRule,
    error: unknown,
  ): void {
    try {
      this.onDegraded?.(operation, rule, error);
    } catch {}
    try {
      this.reporter.degraded(operation, rule, error);
    } catch {}
  }
}

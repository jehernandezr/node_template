import { Backoff, TimerScheduler } from '@platform/primitives';
import { ResilienceGuard } from '../errors/resilience-guard.js';
import type { ResiliencePolicyConfig } from './resilience-policy-config.js';

/** Rules that a policy must meet before being used. */
export class PolicyConfigValidator {
  /**
   * Validated when building the registry, so a bad override fails at startup
   * and not on the first retry.
   * @throws InvalidPolicyError
   */
  static validate(config: ResiliencePolicyConfig): void {
    const guard = ResilienceGuard.instance;
    guard.integerInRange(
      'timeoutMs',
      config.timeoutMs,
      1,
      TimerScheduler.MAX_TIMER_MS,
    );
    if (config.totalTimeoutMs !== undefined) {
      guard.nonNegativeInteger('totalTimeoutMs', config.totalTimeoutMs);
    }
    const retry = config.retry;
    if (retry !== undefined) {
      guard.integerInRange(
        'retry.policy.maxAttempts',
        retry.policy.maxAttempts,
        1,
        Backoff.MAX_ATTEMPT,
      );
      if (retry.maxRetryAfterMs !== undefined) {
        guard.nonNegativeInteger(
          'retry.maxRetryAfterMs',
          retry.maxRetryAfterMs,
        );
      }
    }
    const breaker = config.circuitBreaker;
    if (breaker !== undefined) {
      guard.positiveInteger(
        'circuitBreaker.consecutiveFailures',
        breaker.consecutiveFailures,
      );
      guard.nonNegativeInteger(
        'circuitBreaker.halfOpenAfterMs',
        breaker.halfOpenAfterMs,
      );
    }
    const bulkhead = config.bulkhead;
    if (bulkhead !== undefined) {
      guard.positiveInteger('bulkhead.limit', bulkhead.limit);
      guard.nonNegativeInteger('bulkhead.queue', bulkhead.queue);
    }
  }
}

import {
  PolicyName,
  TimeoutStrategy,
  type ResiliencePolicyConfig,
} from '@platform/resilience';

/**
 * Messaging resilience policies. `Queue` covers the calls to the
 * transport (SNS, SQS): per-attempt timeout and circuit breaker, without retries,
 * because the outbox relay already retries with its own backoff.
 */
export class MessagingPolicies {
  static readonly Queue = PolicyName.of('queue');

  static readonly queue: ResiliencePolicyConfig = {
    timeoutMs: 5_000,
    timeoutStrategy: TimeoutStrategy.Cooperative,
    circuitBreaker: { consecutiveFailures: 5, halfOpenAfterMs: 30_000 },
  };
}

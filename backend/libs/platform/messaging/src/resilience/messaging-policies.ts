import {
  PolicyName,
  TimeoutStrategy,
  type ResiliencePolicyConfig,
} from '@platform/resilience';

/**
 * Políticas de resiliencia de messaging. `Queue` cubre las llamadas al
 * transporte (SNS, SQS): tiempo por intento y circuit breaker, sin reintentos,
 * porque el relay del outbox ya reintenta con su propio backoff.
 */
export class MessagingPolicies {
  static readonly Queue = PolicyName.of('queue');

  static readonly queue: ResiliencePolicyConfig = {
    timeoutMs: 5_000,
    timeoutStrategy: TimeoutStrategy.Cooperative,
    circuitBreaker: { consecutiveFailures: 5, halfOpenAfterMs: 30_000 },
  };
}

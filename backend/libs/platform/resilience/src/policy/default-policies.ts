import { BackoffStrategy, RetryPolicy } from '@platform/primitives';
import { PolicyName } from './policy-name.js';
import type { ResiliencePolicyConfig } from './resilience-policy-config.js';
import { TimeoutStrategy } from './timeout-strategy.enum.js';

/** Políticas que trae la librería. El resto las declara cada servicio. */
export class DefaultPolicies {
  static readonly database: ResiliencePolicyConfig = {
    timeoutMs: 2_000,
    timeoutStrategy: TimeoutStrategy.Cooperative,
    totalTimeoutMs: 5_000,
    retry: {
      policy: new RetryPolicy(3, 50, 500, BackoffStrategy.EqualJitter),
    },
    circuitBreaker: { consecutiveFailures: 5, halfOpenAfterMs: 30_000 },
  };

  static readonly cache: ResiliencePolicyConfig = {
    timeoutMs: 100,
    totalTimeoutMs: 200,
    circuitBreaker: { consecutiveFailures: 5, halfOpenAfterMs: 10_000 },
  };

  /** Políticas por nombre. Las referencias son las mismas que las constantes de arriba. */
  static all(): ReadonlyMap<string, ResiliencePolicyConfig> {
    return new Map<string, ResiliencePolicyConfig>([
      [PolicyName.Cache.value, DefaultPolicies.cache],
      [PolicyName.Database.value, DefaultPolicies.database],
    ]);
  }
}

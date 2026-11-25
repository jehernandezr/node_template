import { SystemClock } from '@platform/kernel';
import { FixedRandomSource } from '@platform/kernel/test-utils';
import { BackoffStrategy, RetryPolicy } from '@platform/primitives';
import { PolicyName } from '../../policy/policy-name.js';
import type { ResiliencePolicyConfig } from '../../policy/resilience-policy-config.js';
import { ResilienceRegistry } from '../../resilience-registry.js';
import type { ResilienceRegistryOptions } from '../../resilience-registry.options.js';

/** Policies and registries that the tests use. */
export class TestPolicies {
  static readonly API = PolicyName.of('test-api');

  /** Retries without a wait, so the tests do not depend on the clock. */
  static readonly NO_WAIT = new RetryPolicy(3, 0, 0, BackoffStrategy.None);

  /** Operation that never ends: only the deadline, the timeout or the signal cut it. */
  static readonly NEVER = (): Promise<never> =>
    new Promise<never>(() => undefined);

  /** Test policy onto which each case's settings are merged. */
  static config(
    overrides: Partial<ResiliencePolicyConfig> = {},
  ): ResiliencePolicyConfig {
    return {
      timeoutMs: 50,
      retry: { policy: TestPolicies.NO_WAIT },
      circuitBreaker: { consecutiveFailures: 10, halfOpenAfterMs: 30 },
      ...overrides,
    };
  }

  /** Registry with the `API` policy; the jitter always takes 0.5. */
  static registry(
    overrides: Partial<ResiliencePolicyConfig> = {},
    options: Partial<ResilienceRegistryOptions> = {},
  ): ResilienceRegistry {
    return new ResilienceRegistry(
      { [TestPolicies.API.value]: TestPolicies.config(overrides) },
      {
        clock: new SystemClock(),
        random: new FixedRandomSource([0.5]),
        ...options,
      },
    );
  }
}

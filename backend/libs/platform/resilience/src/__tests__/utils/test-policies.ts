import { FixedRandomSource } from '@platform/kernel/test-utils';
import { BackoffStrategy, RetryPolicy } from '@platform/primitives';
import { PolicyName } from '../../policy/policy-name.js';
import type { ResiliencePolicyConfig } from '../../policy/resilience-policy-config.js';
import { ResilienceRegistry } from '../../resilience-registry.js';
import type { ResilienceRegistryOptions } from '../../resilience-registry.options.js';

/** Políticas y registros que usan las pruebas. */
export class TestPolicies {
  static readonly API = PolicyName.of('test-api');

  /** Reintentos sin espera, para que las pruebas no dependan del reloj. */
  static readonly NO_WAIT = new RetryPolicy(3, 0, 0, BackoffStrategy.None);

  /** Operación que nunca termina: solo la cortan el plazo, el tiempo o la señal. */
  static readonly NEVER = (): Promise<never> =>
    new Promise<never>(() => undefined);

  /** Política de prueba sobre la que se mezclan los ajustes de cada caso. */
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

  /** Registro con la política `API`; el jitter siempre toma 0.5. */
  static registry(
    overrides: Partial<ResiliencePolicyConfig> = {},
    options: ResilienceRegistryOptions = {},
  ): ResilienceRegistry {
    return new ResilienceRegistry(
      { [TestPolicies.API.value]: TestPolicies.config(overrides) },
      { random: new FixedRandomSource([0.5]), ...options },
    );
  }
}

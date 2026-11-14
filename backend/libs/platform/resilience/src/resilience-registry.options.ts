import type { Clock, RandomSource } from '@platform/kernel';
import type { FailureClassifier } from '@platform/primitives';
import type { PolicyExecutor } from './execution/policy-executor.js';
import type { ResilienceEventBus } from './events/resilience-event-bus.js';
import type { PolicyRegistry } from './policy/policy-registry.js';

/** Colaboradores de {@link ResilienceRegistry}. Todos son opcionales. */
export interface ResilienceRegistryOptions {
  /**
   * Fuente de tiempo para plazos, esperas de `Retry-After`, marcas de los
   * eventos y la espera del half-open del breaker. Por defecto, `SystemClock`.
   */
  readonly clock?: Clock;
  /** Fuente aleatoria para el jitter del backoff. Por defecto, `SystemRandomSource`. */
  readonly random?: RandomSource;
  /** Clasificador de fallas. Por defecto, `FailureClassifier` sin reglas propias. */
  readonly classifier?: FailureClassifier;
  readonly events?: ResilienceEventBus;
  readonly policies?: PolicyRegistry;
  readonly executor?: PolicyExecutor;
}

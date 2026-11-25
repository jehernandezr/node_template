import type { Clock, RandomSource } from '@platform/kernel';
import type { FailureClassifier } from '@platform/primitives';
import type { PolicyExecutor } from './execution/policy-executor.js';
import type { ResilienceEventBus } from './events/resilience-event-bus.js';
import type { PolicyRegistry } from './policy/policy-registry.js';

/** Collaborators of {@link ResilienceRegistry}. All are optional. */
export interface ResilienceRegistryOptions {
  /**
   * Time source for deadlines, `Retry-After` waits, event
   * timestamps and the breaker's half-open wait. Defaults to `SystemClock`.
   */
  readonly clock?: Clock;
  /** Random source for the backoff jitter. Defaults to `SystemRandomSource`. */
  readonly random?: RandomSource;
  /** Failure classifier. Defaults to `FailureClassifier` without custom rules. */
  readonly classifier?: FailureClassifier;
  readonly events?: ResilienceEventBus;
  readonly policies?: PolicyRegistry;
  readonly executor?: PolicyExecutor;
}

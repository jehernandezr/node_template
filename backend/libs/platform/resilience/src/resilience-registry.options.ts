import type { Clock, RandomSource } from '@platform/kernel';
import type { FailureClassifier } from '@platform/primitives';
import type { PolicyExecutor } from './execution/policy-executor.js';
import type { ResilienceEventBus } from './events/resilience-event-bus.js';
import type { PolicyRegistry } from './policy/policy-registry.js';

/** Collaborators of {@link ResilienceRegistry}. The three share the same event bus. */
export interface ResilienceRegistryParts {
  /** Bus to which the policies publish their events. */
  readonly events: ResilienceEventBus;
  /** Merged and validated policies with their per-dependency state. */
  readonly policies: PolicyRegistry;
  /** Runs each call under its policy. */
  readonly executor: PolicyExecutor;
}

/** What {@link ResilienceRegistryFactory} needs to build a registry. */
export interface ResilienceRegistryOptions {
  /**
   * Time source for deadlines, `Retry-After` waits, event
   * timestamps and the breaker's half-open wait.
   */
  readonly clock: Clock;
  /** Random source for the backoff jitter. */
  readonly random: RandomSource;
  /** Decides which errors are transient when a policy does not say. */
  readonly classifier: FailureClassifier;
}

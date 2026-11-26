import { PolicyExecutor } from './execution/policy-executor.js';
import { RetryAfterHint } from './execution/retry-after-hint.js';
import { ResilienceEventBus } from './events/resilience-event-bus.js';
import { PolicyRegistry } from './policy/policy-registry.js';
import type { ResilienceOverrides } from './policy/resilience-overrides.js';
import { ResilienceRegistry } from './resilience-registry.js';
import type { ResilienceRegistryOptions } from './resilience-registry.options.js';

/** Builds a {@link ResilienceRegistry} whose policies and executor share one event bus. */
export class ResilienceRegistryFactory {
  /**
   * Builds the registry with the base policies merged with `overrides`.
   * @param overrides Overrides by name over the base policies.
   * @param options The clock, the randomness and the failure classifier.
   * @returns The registry.
   * @throws InvalidPolicyError if a merged policy is not valid.
   */
  create(
    overrides: ResilienceOverrides,
    options: ResilienceRegistryOptions,
  ): ResilienceRegistry {
    const { clock, random, classifier } = options;
    const events = new ResilienceEventBus(clock);
    return new ResilienceRegistry({
      events,
      policies: new PolicyRegistry(clock, events, classifier, overrides),
      executor: new PolicyExecutor(
        clock,
        random,
        events,
        classifier,
        new RetryAfterHint(clock),
      ),
    });
  }
}

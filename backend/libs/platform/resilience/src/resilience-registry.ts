import { FailureClassifier } from '@platform/primitives';
import { PolicyExecutor } from './execution/policy-executor.js';
import type {
  ResilienceCallOptions,
  ResilientOperation,
} from './execution/resilience-call.options.js';
import { RetryAfterHint } from './execution/retry-after-hint.js';
import { ResilienceEventBus } from './events/resilience-event-bus.js';
import type { ResilienceEventListener } from './events/resilience-event.js';
import { PolicyRegistry } from './policy/policy-registry.js';
import type { PolicyName } from './policy/policy-name.js';
import type { ResilienceOverrides } from './policy/resilience-overrides.js';
import type { ResiliencePolicyConfig } from './policy/resilience-policy-config.js';
import type { ResilienceRegistryOptions } from './resilience-registry.options.js';

/**
 * Runs outgoing calls under the policy declared for each one and
 * publishes what the policies do as events.
 *
 * Breakers and bulkheads are per (policy, dependencyKey).
 */
export class ResilienceRegistry {
  private readonly events: ResilienceEventBus;
  private readonly policies: PolicyRegistry;
  private readonly executor: PolicyExecutor;

  /**
   * @param overrides Overrides by name over the base policies.
   * @param options The clock, the randomness and the optional collaborators.
   * @throws InvalidPolicyError if a merged policy is not valid.
   */
  constructor(
    overrides: ResilienceOverrides = {},
    options: ResilienceRegistryOptions,
  ) {
    const clock = options.clock;
    const classifier = options.classifier ?? new FailureClassifier();
    this.events = options.events ?? new ResilienceEventBus(clock);
    this.policies =
      options.policies ??
      new PolicyRegistry(clock, this.events, overrides, classifier);
    this.executor =
      options.executor ??
      new PolicyExecutor(
        clock,
        options.random,
        this.events,
        classifier,
        new RetryAfterHint(clock),
      );
  }

  /**
   * Runs `fn` under the `name` policy.
   * @param fn Operation; receives the attempt's abort signal and the attempt with its child deadline.
   * @throws CircuitOpenError, ResilienceTimeoutError or BulkheadFullError (all
   *   `ResilienceError`), or `UnknownPolicyError` if the policy does not exist. A
   *   caller abort rejects with its signal's reason; other errors are
   *   rethrown as is.
   */
  async execute<T>(
    name: PolicyName,
    fn: ResilientOperation<T>,
    options: ResilienceCallOptions = {},
  ): Promise<T> {
    const config = this.policies.config(name);
    const dependencyKey = options.dependencyKey ?? name.value;
    const entry = this.policies.dependency(name, dependencyKey);
    return this.executor.run({
      name,
      dependencyKey,
      config,
      entry,
      fn,
      options,
    });
  }

  /**
   * Registers a service's policy.
   * @throws InvalidPolicyError if the name already has another configuration.
   */
  register(name: PolicyName, config: ResiliencePolicyConfig): void {
    this.policies.register(name, config);
  }

  /**
   * Subscribes to the policies' events.
   * @returns function that removes the subscriber.
   */
  subscribe(listener: ResilienceEventListener): () => void {
    return this.events.subscribe(listener);
  }
}

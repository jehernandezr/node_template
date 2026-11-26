import type { Clock } from '@platform/kernel';
import type { FailureClassifier } from '@platform/primitives';
import { BulkheadFullError } from '../errors/bulkhead-full.error.js';
import { CircuitOpenError } from '../errors/circuit-open.error.js';
import { InvalidPolicyError } from '../errors/invalid-policy.error.js';
import { ResilienceTimeoutError } from '../errors/resilience-timeout.error.js';
import { TimeoutScope } from '../errors/timeout-scope.enum.js';
import { UnknownPolicyError } from '../errors/unknown-policy.error.js';
import { Bulkhead } from '../execution/bulkhead.js';
import { ConsecutiveCircuitBreaker } from '../execution/consecutive-circuit-breaker.js';
import { ErrorEventDetail } from '../events/error-event-detail.js';
import type { ResilienceEventBus } from '../events/resilience-event-bus.js';
import { ResilienceEventKind } from '../events/resilience-event-kind.enum.js';
import type { ResilienceEventDetail } from '../events/resilience-event.js';
import { DefaultPolicies } from './default-policies.js';
import type { DependencyEntry } from './dependency-entry.js';
import { PolicyConfigValidator } from './policy-config-validator.js';
import { PolicyName } from './policy-name.js';
import type { ResilienceOverrides } from './resilience-overrides.js';
import type { ResiliencePolicyConfig } from './resilience-policy-config.js';

/**
 * Stores the policies by name, with their overrides merged, and the breakers and
 * bulkheads of each dependency. A name without a base can arrive with partial
 * overrides before its `register`; they stay pending until then.
 */
export class PolicyRegistry {
  /** Base configuration each policy was registered with. */
  private readonly bases = new Map<string, ResiliencePolicyConfig>();
  /** Effective configuration, already merged and validated. */
  private readonly configs = new Map<string, ResiliencePolicyConfig>();
  /** Overrides waiting for their base policy to be registered. */
  private readonly pending = new Map<string, Partial<ResiliencePolicyConfig>>();
  private readonly entries = new Map<string, Map<string, DependencyEntry>>();

  /**
   * @param clock Clock of the breaker and the deadlines.
   * @param events Bus to which each dependency's events are published.
   * @param classifier Decides which errors are transient when the policy does not say.
   * @param overrides Overrides by name over the base policies.
   * @throws InvalidPolicyError if a key or a policy is not valid.
   */
  constructor(
    private readonly clock: Clock,
    private readonly events: ResilienceEventBus,
    private readonly classifier: FailureClassifier,
    overrides: ResilienceOverrides = {},
  ) {
    for (const key of Object.keys(overrides)) {
      PolicyName.of(key);
    }
    for (const [name, base] of DefaultPolicies.all()) {
      this.bases.set(name, base);
      this.install(name, { ...base, ...overrides[name] });
    }
    for (const [name, override] of Object.entries(overrides)) {
      if (this.bases.has(name)) {
        continue;
      }
      const timeoutMs = override.timeoutMs;
      if (timeoutMs === undefined) {
        this.pending.set(name, override);
        continue;
      }
      const full = { ...override, timeoutMs };
      this.install(name, full);
      this.bases.set(name, full);
    }
  }

  /**
   * Registers a service's policy. Registering the same reference again
   * does nothing; a different configuration for the same name fails.
   * @param name Policy name.
   * @param config Policy configuration.
   * @throws InvalidPolicyError
   */
  register(name: PolicyName, config: ResiliencePolicyConfig): void {
    const known = this.bases.get(name.value);
    if (known !== undefined) {
      if (known === config) {
        return;
      }
      throw new InvalidPolicyError(
        `Policy "${name.value}" is already registered with another configuration`,
      );
    }
    this.install(name.value, { ...config, ...this.pending.get(name.value) });
    this.bases.set(name.value, config);
    this.pending.delete(name.value);
  }

  /**
   * Reads the configuration of a policy.
   * @param name Policy name.
   * @returns The configuration.
   * @throws UnknownPolicyError if there is no policy with that name.
   */
  config(name: PolicyName): ResiliencePolicyConfig {
    const config = this.configs.get(name.value);
    if (config === undefined) {
      throw new UnknownPolicyError(name.value);
    }
    return config;
  }

  /**
   * Breaker and bulkhead of the dependency, created the first time.
   * @param name Policy name.
   * @param dependencyKey Dependency.
   * @returns The breaker and bulkhead.
   */
  dependency(name: PolicyName, dependencyKey: string): DependencyEntry {
    let byDependency = this.entries.get(name.value);
    if (byDependency === undefined) {
      byDependency = new Map<string, DependencyEntry>();
      this.entries.set(name.value, byDependency);
    }
    let entry = byDependency.get(dependencyKey);
    if (entry === undefined) {
      entry = this.createEntry(name, dependencyKey, this.config(name));
      byDependency.set(dependencyKey, entry);
    }
    return entry;
  }

  private install(name: string, config: ResiliencePolicyConfig): void {
    PolicyConfigValidator.validate(config);
    this.configs.set(name, config);
  }

  /**
   * Attempt timeouts count as a failure. Non-transient errors, cancellations and an exhausted caller deadline do not open the circuit.
   */
  private createEntry(
    name: PolicyName,
    dependencyKey: string,
    config: ResiliencePolicyConfig,
  ): DependencyEntry {
    const publish = (
      kind: ResilienceEventKind,
      detail?: ResilienceEventDetail,
    ): void => {
      this.events.publish(name.value, dependencyKey, kind, detail);
    };
    const isTransient =
      config.isTransient ??
      ((error: unknown): boolean => this.classifier.isTransient(error));

    const bulkheadConfig = config.bulkhead;
    const bulkhead =
      bulkheadConfig === undefined
        ? undefined
        : new Bulkhead({
            limit: bulkheadConfig.limit,
            queue: bulkheadConfig.queue,
            rejectWith: () => new BulkheadFullError(name.value, dependencyKey),
            onReject: () => {
              publish(ResilienceEventKind.BulkheadRejected);
            },
          });

    const breakerConfig = config.circuitBreaker;
    const breaker =
      breakerConfig === undefined
        ? undefined
        : new ConsecutiveCircuitBreaker({
            consecutiveFailures: breakerConfig.consecutiveFailures,
            halfOpenAfterMs: breakerConfig.halfOpenAfterMs,
            clock: this.clock,
            counts: (error) =>
              error instanceof ResilienceTimeoutError
                ? error.scope === TimeoutScope.Attempt
                : isTransient(error),
            rejectWith: () =>
              new CircuitOpenError(name.value, dependencyKey, {
                retryAfterMs: breakerConfig.halfOpenAfterMs,
              }),
            onBreak: (error) => {
              publish(ResilienceEventKind.Break, ErrorEventDetail.of(error));
            },
            onHalfOpen: () => {
              publish(ResilienceEventKind.HalfOpen);
            },
            onReset: () => {
              publish(ResilienceEventKind.Reset);
            },
          });

    return { bulkhead, breaker };
  }
}

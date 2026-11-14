import type { Clock } from '@platform/kernel';
import { FailureClassifier } from '@platform/primitives';
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
 * Guarda las políticas por nombre, con sus ajustes mezclados, y los breakers y
 * bulkheads de cada dependencia. Un nombre sin base puede llegar con ajustes
 * parciales antes que su `register`; quedan pendientes hasta entonces.
 */
export class PolicyRegistry {
  /** Configuración base con la que se registró cada política. */
  private readonly bases = new Map<string, ResiliencePolicyConfig>();
  /** Configuración efectiva, ya mezclada y validada. */
  private readonly configs = new Map<string, ResiliencePolicyConfig>();
  /** Ajustes que esperan a que se registre su política base. */
  private readonly pending = new Map<string, Partial<ResiliencePolicyConfig>>();
  private readonly entries = new Map<string, Map<string, DependencyEntry>>();

  /**
   * @param clock Reloj del breaker y de los plazos.
   * @param events Bus al que se publican los eventos de cada dependencia.
   * @param overrides Ajustes por nombre sobre las políticas base.
   * @param classifier Decide qué errores son transitorios cuando la política no lo dice.
   * @throws InvalidPolicyError si una clave o una política no es válida.
   */
  constructor(
    private readonly clock: Clock,
    private readonly events: ResilienceEventBus,
    overrides: ResilienceOverrides = {},
    private readonly classifier: FailureClassifier = new FailureClassifier(),
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
   * Registra la política de un servicio. Registrar la misma referencia otra
   * vez no hace nada; otra configuración para el mismo nombre falla.
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

  /** @throws UnknownPolicyError si no hay ninguna política con ese nombre. */
  config(name: PolicyName): ResiliencePolicyConfig {
    const config = this.configs.get(name.value);
    if (config === undefined) {
      throw new UnknownPolicyError(name.value);
    }
    return config;
  }

  /** Breaker y bulkhead de la dependencia, creados la primera vez. */
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
            // Los timeouts de intento cuentan como falla. Los errores no
            // transitorios, las cancelaciones y un plazo agotado del llamador
            // no abren el circuito.
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

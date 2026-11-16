import { SystemClock, SystemRandomSource } from '@platform/kernel';
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
 * Ejecuta las llamadas salientes bajo la política declarada para cada una y
 * publica lo que las políticas hacen como eventos.
 *
 * Los breakers y los bulkheads son por (política, dependencyKey).
 */
export class ResilienceRegistry {
  private readonly events: ResilienceEventBus;
  private readonly policies: PolicyRegistry;
  private readonly executor: PolicyExecutor;

  /**
   * Los valores por defecto permiten usar la librería sin NestJS; el módulo
   * pasa todos los colaboradores.
   * @param overrides Ajustes por nombre sobre las políticas base.
   * @param options Colaboradores opcionales.
   * @throws InvalidPolicyError si una política mezclada no es válida.
   */
  constructor(
    overrides: ResilienceOverrides = {},
    options: ResilienceRegistryOptions = {},
  ) {
    const clock = options.clock ?? new SystemClock();
    const classifier = options.classifier ?? new FailureClassifier();
    this.events = options.events ?? new ResilienceEventBus(clock);
    this.policies =
      options.policies ??
      new PolicyRegistry(clock, this.events, overrides, classifier);
    this.executor =
      options.executor ??
      new PolicyExecutor(
        clock,
        options.random ?? new SystemRandomSource(),
        this.events,
        classifier,
        new RetryAfterHint(clock),
      );
  }

  /**
   * Ejecuta `fn` bajo la política `name`.
   * @param fn Operación; recibe la señal de aborto del intento y el intento con su plazo hijo.
   * @throws CircuitOpenError, ResilienceTimeoutError o BulkheadFullError (todas
   *   `ResilienceError`), o `UnknownPolicyError` si la política no existe. Un
   *   aborto del llamador rechaza con el motivo de su señal; otros errores se
   *   relanzan tal cual.
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
   * Registra la política de un servicio.
   * @throws InvalidPolicyError si el nombre ya tiene otra configuración.
   */
  register(name: PolicyName, config: ResiliencePolicyConfig): void {
    this.policies.register(name, config);
  }

  /**
   * Suscribe a los eventos de las políticas.
   * @returns función que quita al suscriptor.
   */
  subscribe(listener: ResilienceEventListener): () => void {
    return this.events.subscribe(listener);
  }
}

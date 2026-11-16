import type { ContractRegistry } from '@platform/internal-api';
import type { TransactionManager } from '@platform/kernel';
import {
  FixedClock,
  FixedRandomSource,
  SequentialIdGenerator,
} from '@platform/kernel/test-utils';
import {
  Redactor,
  TraceContextRestorer,
  Tracing,
  type LoggerPort,
  type RequestContextStore,
} from '@platform/observability';
import { CallOutcomeFactory, FailureClassifier } from '@platform/primitives';
import { OperationResolver } from '@platform/internal-api';
import type { SagaDefinition } from '../../definition/saga-definition.js';
import { SagaRegistry } from '../../definition/saga-registry.js';
import { CompensationRunner } from '../../engine/compensation-runner.js';
import { LeaseKeeper } from '../../engine/lease-keeper.js';
import { SagaEngine } from '../../engine/saga-engine.js';
import { SagaEventPublisher } from '../../engine/saga-event-publisher.js';
import { SagaSettings } from '../../engine/saga-settings.js';
import type { SagaSettingsInput } from '../../engine/saga-settings-input.js';
import { Sagas } from '../../engine/sagas.js';
import { StepCaller } from '../../engine/step-caller.js';
import { StepExecutor } from '../../engine/step-executor.js';
import type { OperationInvoker } from '../../invoker/operation-invoker.js';
import type { SagaStore } from '../../store/saga-store.js';
import { InMemorySagaStore } from './in-memory-saga-store.js';

/** Con qué se arma un `SagaEngineKit`. */
export interface SagaEngineKitOptions {
  readonly invoker: OperationInvoker;
  readonly definitions: readonly SagaDefinition<unknown>[];
  /** Por defecto, un `InMemorySagaStore` nuevo. */
  readonly store?: SagaStore;
  /** Por defecto, el catálogo del invocador. */
  readonly contracts?: ContractRegistry;
  /** Por defecto, un `FixedClock` en 2026-01-01. Las pruebas lo avanzan para vencer leases y plazos. */
  readonly clock?: FixedClock;
  /** Identidad de la corrida. Por defecto `node-a`. */
  readonly owner?: string;
  /** Sobrescribe los valores por defecto de `SagaSettings`. */
  readonly settings?: Partial<SagaSettingsInput>;
  readonly logger?: LoggerPort;
  /** La petición en curso, de la que el motor toma tenant y actor al arrancar. */
  readonly requestContext?: RequestContextStore;
  /** Las transacciones del caso de uso que arranca sagas. */
  readonly transactions?: TransactionManager;
}

/**
 * Arma un `SagaEngine` completo sin NestJS, con los mismos colaboradores que
 * `SagaModule`. `engineFor(owner)` da otro motor sobre el mismo almacén, reloj
 * y registro: es otro proceso del mismo servicio.
 */
export class SagaEngineKit {
  readonly store: SagaStore;
  readonly clock: FixedClock;
  readonly registry: SagaRegistry;
  readonly events: SagaEventPublisher;
  readonly settings: SagaSettings;
  readonly engine: SagaEngine;
  readonly sagas: Sagas;
  private readonly ids = new SequentialIdGenerator();

  constructor(private readonly options: SagaEngineKitOptions) {
    this.store = options.store ?? new InMemorySagaStore();
    this.clock =
      options.clock ?? new FixedClock(new Date('2026-01-01T00:00:00.000Z'));
    this.settings = this.settingsFor(options.owner ?? 'node-a');
    this.registry = new SagaRegistry({
      resolver: new OperationResolver(),
      maxStepDurationMs: this.settings.maxStepDurationMs,
      contracts: options.contracts ?? options.invoker.contracts,
    });
    this.registry.add(...options.definitions);
    this.events = new SagaEventPublisher(options.logger);
    this.engine = this.build(this.settings);
    this.sagas = new Sagas(this.engine, this.registry);
  }

  /** Otro motor (otro proceso) sobre el mismo almacén, reloj y registro. */
  engineFor(owner: string): SagaEngine {
    return this.build(this.settingsFor(owner));
  }

  private settingsFor(owner: string): SagaSettings {
    return new SagaSettings(
      { owner, ...this.options.settings },
      new FixedRandomSource([0.5]),
    );
  }

  private build(settings: SagaSettings): SagaEngine {
    const tracing = new Tracing(new Redactor());
    const restorer = new TraceContextRestorer(tracing);
    const leases = new LeaseKeeper(
      this.store,
      settings,
      this.clock,
      this.ids,
      this.options.logger,
    );
    const caller = new StepCaller({
      store: this.store,
      invoker: this.options.invoker,
      leases,
      settings,
      clock: this.clock,
      tracing,
      restorer,
      outcomes: new CallOutcomeFactory(new FailureClassifier()),
      ...(this.options.logger === undefined
        ? {}
        : { logger: this.options.logger }),
    });
    const collaborators = {
      caller,
      events: this.events,
      settings,
      clock: this.clock,
      ...(this.options.logger === undefined
        ? {}
        : { logger: this.options.logger }),
    };
    return new SagaEngine({
      store: this.store,
      registry: this.registry,
      leases,
      executor: new StepExecutor(collaborators),
      compensations: new CompensationRunner(collaborators),
      events: this.events,
      clock: this.clock,
      ids: this.ids,
      restorer,
      ...(this.options.requestContext === undefined
        ? {}
        : { requestContext: this.options.requestContext }),
      ...(this.options.transactions === undefined
        ? {}
        : { transactions: this.options.transactions }),
    });
  }
}

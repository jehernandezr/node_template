import type { Provider } from '@nestjs/common';
import { OperationResolver, InternalClient } from '@platform/internal-api';
import {
  Clock,
  IdGenerator,
  RandomSource,
  TransactionManager,
} from '@platform/kernel';
import {
  LoggerPort,
  RequestContextStore,
  TraceContextRestorer,
  Tracing,
} from '@platform/observability';
import { CallOutcomeFactory, FailureClassifier } from '@platform/primitives';
import { CompensationRunner } from '../engine/compensation-runner.js';
import { LeaseKeeper } from '../engine/lease-keeper.js';
import { SagaEngine } from '../engine/saga-engine.js';
import { SagaEventPublisher } from '../engine/saga-event-publisher.js';
import { SagaSettings } from '../engine/saga-settings.js';
import { Sagas } from '../engine/sagas.js';
import { StepCaller } from '../engine/step-caller.js';
import { StepExecutor } from '../engine/step-executor.js';
import { SagaRegistry } from '../definition/saga-registry.js';
import { InternalClientInvoker } from '../invoker/internal-client-invoker.js';
import { OperationInvoker } from '../invoker/operation-invoker.js';
import { SagaRecoveryJob } from '../jobs/saga-recovery-job.js';
import { SagaRetentionJob } from '../jobs/saga-retention-job.js';
import { AmbientSagaScopes } from '../store/ambient-saga-scopes.js';
import { SagaScopes } from '../store/saga-scopes.js';
import { SagaStore } from '../store/saga-store.js';
import { SagaBootstrap } from './saga-bootstrap.js';
import type { SagaModuleExtras } from './saga-module-extras.js';
import type { SagaModuleOptions } from './saga-module-options.js';
import { SAGA_MODULE_OPTIONS } from './saga.module-definition.js';

/**
 * Providers of `SagaModule`. Optional dependencies are requested with
 * `{ token, optional: true }` and, if missing, are not passed (never an explicit
 * `undefined`, because optional fields do not accept it).
 */
export class SagaProviders {
  /**
   * `SagaModule` already checked that the store exists.
   */
  static build(extras: SagaModuleExtras): Provider[] {
    const { store } = extras as Required<Pick<SagaModuleExtras, 'store'>>;
    return [
      ...SagaProviders.random(extras),
      SagaProviders.settings(),
      { provide: SagaStore, useExisting: store },
      ...SagaProviders.scopes(extras),
      SagaProviders.invoker(extras),
      { provide: OperationResolver, useFactory: () => new OperationResolver() },
      SagaProviders.registry(),
      SagaProviders.leases(),
      {
        provide: SagaEventPublisher,
        useFactory: (logger?: LoggerPort) => new SagaEventPublisher(logger),
        inject: [{ token: LoggerPort, optional: true }],
      },
      SagaProviders.caller(),
      SagaProviders.executor(),
      SagaProviders.compensations(),
      SagaProviders.engine(),
      {
        provide: Sagas,
        useFactory: (engine: SagaEngine, registry: SagaRegistry) =>
          new Sagas(engine, registry),
        inject: [SagaEngine, SagaRegistry],
      },
      SagaProviders.recovery(),
      SagaProviders.retention(),
      SagaBootstrap,
    ];
  }

  private static random(extras: SagaModuleExtras): Provider[] {
    return extras.random === undefined
      ? []
      : [{ provide: RandomSource, useExisting: extras.random }];
  }

  /** Default owner: a new id. The rest takes the values of `SagaSettings`. */
  private static settings(): Provider {
    return {
      provide: SagaSettings,
      useFactory: (
        options: SagaModuleOptions,
        random: RandomSource,
        ids: IdGenerator,
      ) =>
        new SagaSettings(
          { ...options, owner: options.owner ?? ids.next().toString() },
          random,
        ),
      inject: [SAGA_MODULE_OPTIONS, RandomSource, IdGenerator],
    };
  }

  private static scopes(extras: SagaModuleExtras): Provider[] {
    return extras.scopes === undefined
      ? [
          AmbientSagaScopes,
          { provide: SagaScopes, useExisting: AmbientSagaScopes },
        ]
      : [{ provide: SagaScopes, useExisting: extras.scopes }];
  }

  /** By default, the invoker on the `InternalClient` of `InternalApiModule`. */
  private static invoker(extras: SagaModuleExtras): Provider {
    if (extras.invoker !== undefined) {
      return { provide: OperationInvoker, useExisting: extras.invoker };
    }
    return {
      provide: OperationInvoker,
      useFactory: (client: InternalClient) => new InternalClientInvoker(client),
      inject: [InternalClient],
    };
  }

  private static registry(): Provider {
    return {
      provide: SagaRegistry,
      useFactory: (
        resolver: OperationResolver,
        settings: SagaSettings,
        invoker: OperationInvoker,
      ) =>
        new SagaRegistry({
          resolver,
          maxStepDurationMs: settings.maxStepDurationMs,
          ...(invoker.contracts === undefined
            ? {}
            : { contracts: invoker.contracts }),
        }),
      inject: [OperationResolver, SagaSettings, OperationInvoker],
    };
  }

  private static leases(): Provider {
    return {
      provide: LeaseKeeper,
      useFactory: (
        store: SagaStore,
        settings: SagaSettings,
        clock: Clock,
        ids: IdGenerator,
        logger?: LoggerPort,
      ) => new LeaseKeeper(store, settings, clock, ids, logger),
      inject: [
        SagaStore,
        SagaSettings,
        Clock,
        IdGenerator,
        { token: LoggerPort, optional: true },
      ],
    };
  }

  private static caller(): Provider {
    return {
      provide: StepCaller,
      useFactory: (
        store: SagaStore,
        invoker: OperationInvoker,
        leases: LeaseKeeper,
        settings: SagaSettings,
        clock: Clock,
        tracing: Tracing,
        restorer: TraceContextRestorer,
        failures: FailureClassifier,
        logger?: LoggerPort,
      ) =>
        new StepCaller({
          store,
          invoker,
          leases,
          settings,
          clock,
          tracing,
          restorer,
          outcomes: new CallOutcomeFactory(failures),
          ...(logger === undefined ? {} : { logger }),
        }),
      inject: [
        SagaStore,
        OperationInvoker,
        LeaseKeeper,
        SagaSettings,
        Clock,
        Tracing,
        TraceContextRestorer,
        FailureClassifier,
        { token: LoggerPort, optional: true },
      ],
    };
  }

  private static executor(): Provider {
    return {
      provide: StepExecutor,
      useFactory: (
        caller: StepCaller,
        events: SagaEventPublisher,
        settings: SagaSettings,
        clock: Clock,
        logger?: LoggerPort,
      ) =>
        new StepExecutor({
          caller,
          events,
          settings,
          clock,
          ...(logger === undefined ? {} : { logger }),
        }),
      inject: [
        StepCaller,
        SagaEventPublisher,
        SagaSettings,
        Clock,
        { token: LoggerPort, optional: true },
      ],
    };
  }

  private static compensations(): Provider {
    return {
      provide: CompensationRunner,
      useFactory: (
        caller: StepCaller,
        events: SagaEventPublisher,
        settings: SagaSettings,
        clock: Clock,
        logger?: LoggerPort,
      ) =>
        new CompensationRunner({
          caller,
          events,
          settings,
          clock,
          ...(logger === undefined ? {} : { logger }),
        }),
      inject: [
        StepCaller,
        SagaEventPublisher,
        SagaSettings,
        Clock,
        { token: LoggerPort, optional: true },
      ],
    };
  }

  private static engine(): Provider {
    return {
      provide: SagaEngine,
      useFactory: (
        store: SagaStore,
        registry: SagaRegistry,
        leases: LeaseKeeper,
        executor: StepExecutor,
        compensations: CompensationRunner,
        events: SagaEventPublisher,
        clock: Clock,
        ids: IdGenerator,
        restorer: TraceContextRestorer,
        requestContext?: RequestContextStore,
        transactions?: TransactionManager,
      ) =>
        new SagaEngine({
          store,
          registry,
          leases,
          executor,
          compensations,
          events,
          clock,
          ids,
          restorer,
          ...(requestContext === undefined ? {} : { requestContext }),
          ...(transactions === undefined ? {} : { transactions }),
        }),
      inject: [
        SagaStore,
        SagaRegistry,
        LeaseKeeper,
        StepExecutor,
        CompensationRunner,
        SagaEventPublisher,
        Clock,
        IdGenerator,
        TraceContextRestorer,
        { token: RequestContextStore, optional: true },
        { token: TransactionManager, optional: true },
      ],
    };
  }

  private static recovery(): Provider {
    return {
      provide: SagaRecoveryJob,
      useFactory: (
        engine: SagaEngine,
        store: SagaStore,
        scopes: SagaScopes,
        settings: SagaSettings,
        clock: Clock,
        logger?: LoggerPort,
      ) =>
        new SagaRecoveryJob({
          engine,
          store,
          scopes,
          settings,
          clock,
          ...(logger === undefined ? {} : { logger }),
        }),
      inject: [
        SagaEngine,
        SagaStore,
        SagaScopes,
        SagaSettings,
        Clock,
        { token: LoggerPort, optional: true },
      ],
    };
  }

  private static retention(): Provider {
    return {
      provide: SagaRetentionJob,
      useFactory: (store: SagaStore, settings: SagaSettings, clock: Clock) =>
        new SagaRetentionJob(store, settings, clock),
      inject: [SagaStore, SagaSettings, Clock],
    };
  }
}

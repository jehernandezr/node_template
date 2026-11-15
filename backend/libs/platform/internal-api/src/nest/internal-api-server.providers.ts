import type { Provider, Type } from '@nestjs/common';
import {
  SystemClock,
  type Clock,
  type PurgeableStore,
  type TransactionManager,
} from '@platform/kernel';
import { TraceContextRestorer, Tracing } from '@platform/observability';
import { CallOutcomeFactory } from '@platform/primitives';
import { DenyAllInternalCallAuthenticator } from '../auth/deny-all-internal-call-authenticator.js';
import { HmacInternalCallAuthenticator } from '../auth/hmac-internal-call-authenticator.js';
import { InternalCallAuthenticator } from '../auth/internal-call-authenticator.js';
import { OperationResolver } from '../contract/operation-resolver.js';
import { PayloadLimit } from '../contract/payload-limit.js';
import { HandlerOutcomeChecker } from '../server/handler-outcome-checker.js';
import { IdempotencyGate } from '../server/idempotency-gate.js';
import { InternalRouter } from '../server/internal-router.js';
import { OperationDispatcher } from '../server/operation-dispatcher.js';
import { ProcessedOperationRetentionJob } from '../server/processed-operation-retention-job.js';
import { ProcessedOperationStore } from '../server/processed-operation-store.js';
import { UnitOfWorkRunner } from '../server/unit-of-work-runner.js';
import { CallMetaReader } from '../transport/call-meta-reader.js';
import { InternalHandlerExplorer } from './internal-handler.explorer.js';
import type {
  InternalApiModuleOptions,
  ResolvedInternalApiExtras,
} from './internal-api-module-options.js';
import { InternalApiOptionalDependency } from './internal-api-optional-dependency.js';
import { INTERNAL_API_OPTIONS } from './internal-api.module-definition.js';

/** Proveedores del lado servidor: router, idempotencia, unidad de trabajo, autenticación y retención. */
export class InternalApiServerProviders {
  static build(extras: ResolvedInternalApiExtras): Provider[] {
    return [
      { provide: ProcessedOperationStore, useExisting: extras.processedStore },
      ...InternalApiServerProviders.pipeline(),
      ...InternalApiServerProviders.edge(),
      ...InternalApiServerProviders.retention(extras.purgeableStore),
    ];
  }

  private static pipeline(): Provider[] {
    return [
      {
        provide: IdempotencyGate,
        useFactory: (
          store: ProcessedOperationStore,
          outcomes: CallOutcomeFactory,
          options: InternalApiModuleOptions,
        ) =>
          new IdempotencyGate(store, outcomes, {
            ...(options.leaseMarginMs !== undefined && {
              leaseMarginMs: options.leaseMarginMs,
            }),
            ...(options.minLeaseMs !== undefined && {
              minLeaseMs: options.minLeaseMs,
            }),
          }),
        inject: [
          ProcessedOperationStore,
          CallOutcomeFactory,
          INTERNAL_API_OPTIONS,
        ],
      },
      {
        provide: HandlerOutcomeChecker,
        useFactory: (payload: PayloadLimit) =>
          new HandlerOutcomeChecker(payload),
        inject: [PayloadLimit],
      },
      {
        provide: UnitOfWorkRunner,
        useFactory: (
          gate: IdempotencyGate,
          checker: HandlerOutcomeChecker,
          outcomes: CallOutcomeFactory,
          transactions?: TransactionManager,
        ) => new UnitOfWorkRunner(gate, checker, outcomes, transactions),
        inject: [
          IdempotencyGate,
          HandlerOutcomeChecker,
          CallOutcomeFactory,
          InternalApiOptionalDependency.TRANSACTIONS,
        ],
      },
      {
        provide: OperationDispatcher,
        useFactory: (
          payload: PayloadLimit,
          gate: IdempotencyGate,
          runner: UnitOfWorkRunner,
          clock: Clock | undefined,
          outcomes: CallOutcomeFactory,
        ) =>
          new OperationDispatcher(
            payload,
            gate,
            runner,
            clock ?? new SystemClock(),
            outcomes,
          ),
        inject: [
          PayloadLimit,
          IdempotencyGate,
          UnitOfWorkRunner,
          InternalApiOptionalDependency.CLOCK,
          CallOutcomeFactory,
        ],
      },
      {
        provide: InternalRouter,
        useFactory: (
          resolver: OperationResolver,
          dispatcher: OperationDispatcher,
          tracing: Tracing,
          restorer: TraceContextRestorer,
        ) => new InternalRouter(resolver, dispatcher, tracing, restorer),
        inject: [
          OperationResolver,
          OperationDispatcher,
          Tracing,
          TraceContextRestorer,
        ],
      },
      InternalHandlerExplorer,
    ];
  }

  /** Lo que usa el controller: sin opciones `http` no hay secreto, así que rechaza toda llamada. */
  private static edge(): Provider[] {
    return [
      { provide: CallMetaReader, useFactory: () => new CallMetaReader() },
      {
        provide: InternalCallAuthenticator,
        useFactory: (
          options: InternalApiModuleOptions,
          clock: Clock | undefined,
        ) =>
          options.http === undefined
            ? new DenyAllInternalCallAuthenticator()
            : new HmacInternalCallAuthenticator(
                options.http.secret,
                clock ?? new SystemClock(),
                options.http.signatureWindowMs,
              ),
        inject: [INTERNAL_API_OPTIONS, InternalApiOptionalDependency.CLOCK],
      },
    ];
  }

  private static retention(
    store: Type<PurgeableStore> | undefined,
  ): Provider[] {
    if (store === undefined) {
      return [];
    }
    return [
      {
        provide: ProcessedOperationRetentionJob,
        useFactory: (
          purgeable: PurgeableStore,
          clock: Clock | undefined,
          options: InternalApiModuleOptions,
        ) =>
          new ProcessedOperationRetentionJob(
            purgeable,
            clock ?? new SystemClock(),
            options.retentionMs,
          ),
        inject: [
          store,
          InternalApiOptionalDependency.CLOCK,
          INTERNAL_API_OPTIONS,
        ],
      },
    ];
  }
}

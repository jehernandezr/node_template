import { ClaimKeeper } from '../../server/claim-keeper.js';
import { CompensationTombstones } from '../../server/compensation-tombstones.js';
import type { OperationDefinition } from '@contracts/platform';
import type { Clock, IdGenerator, TransactionManager } from '@platform/kernel';
import {
  Redactor,
  TraceContextRestorer,
  Tracing,
} from '@platform/observability';
import { CallOutcomeFactory, FailureClassifier } from '@platform/primitives';
import { ResilienceRegistry } from '@platform/resilience';
import { CallErrorTranslator } from '../../client/call-error-translator.js';
import { ClientOutcomeChecker } from '../../client/client-outcome-checker.js';
import { ExternalApiPolicy } from '../../client/external-api-policy.js';
import { InternalClient } from '../../client/internal-client.js';
import { OperationPolicyResolver } from '../../client/operation-policy-resolver.js';
import { ContractRegistry } from '../../contract/contract-registry.js';
import { OperationResolver } from '../../contract/operation-resolver.js';
import { PayloadLimit } from '../../contract/payload-limit.js';
import { HandlerOutcomeChecker } from '../../server/handler-outcome-checker.js';
import { IdempotencyGate } from '../../server/idempotency-gate.js';
import { InternalRouter } from '../../server/internal-router.js';
import { OperationDispatcher } from '../../server/operation-dispatcher.js';
import { UnitOfWorkRunner } from '../../server/unit-of-work-runner.js';
import { InProcessTransport } from '../../transport/in-process-transport.js';
import { InMemoryProcessedOperationStore } from './in-memory-processed-operation-store.js';

/** Lo que necesita `InProcessInternalApi`: el reloj y los ids gobiernan los plazos y los claims. */
export interface InProcessInternalApiOptions {
  readonly clock: Clock;
  readonly ids: IdGenerator;
  /** Operaciones del catálogo del cliente; cada una necesita un handler en `router`. */
  readonly operations: readonly OperationDefinition[];
  /** Sin él, el router guarda los resultados fuera de una unidad de trabajo. */
  readonly transactions?: TransactionManager;
}

/**
 * API interna completa en un solo proceso, sin NestJS: cliente, transporte en
 * proceso y router con sus colaboradores reales sobre
 * `InMemoryProcessedOperationStore`. Sirve a las librerías que consumen el
 * `InternalClient` y quieren probarlo de punta a punta.
 */
export class InProcessInternalApi {
  readonly store: InMemoryProcessedOperationStore;
  readonly registry: ContractRegistry;
  readonly router: InternalRouter;
  readonly transport: InProcessTransport;
  readonly resilience = new ResilienceRegistry();
  readonly client: InternalClient;

  constructor(options: InProcessInternalApiOptions) {
    const outcomes = new CallOutcomeFactory(new FailureClassifier());
    const payload = new PayloadLimit();
    const resolver = new OperationResolver();
    const tracing = new Tracing(new Redactor());
    const restorer = new TraceContextRestorer(tracing);
    this.store = new InMemoryProcessedOperationStore(
      options.clock,
      options.ids,
    );
    this.registry = new ContractRegistry({ resolver });
    this.registry.register(...options.operations);
    this.registry.assertValid();
    const gate = new IdempotencyGate(this.store, outcomes);
    const runner = new UnitOfWorkRunner(
      gate,
      new HandlerOutcomeChecker(payload),
      outcomes,
      options.transactions,
    );
    this.router = new InternalRouter(
      resolver,
      new OperationDispatcher(
        payload,
        gate,
        runner,
        options.clock,
        outcomes,
        new ClaimKeeper(this.store, options.clock),
        new CompensationTombstones(this.store),
      ),
      tracing,
      restorer,
    );
    this.transport = new InProcessTransport(this.router);
    this.resilience.register(ExternalApiPolicy.NAME, ExternalApiPolicy.CONFIG);
    this.client = new InternalClient({
      transport: this.transport,
      resilience: this.resilience,
      resolver,
      policies: new OperationPolicyResolver(this.resilience),
      translator: new CallErrorTranslator(outcomes),
      checker: new ClientOutcomeChecker(payload),
      restorer,
      clock: options.clock,
      payload,
      registry: this.registry,
    });
  }
}

import { ClaimKeeper } from '../../claim-keeper.js';
import { CompensationTombstones } from '../../compensation-tombstones.js';
import type { ClaimKeeperOptions } from '../../claim-keeper.options.js';
import { FixedClock, SequentialIdGenerator } from '@platform/kernel/test-utils';
import {
  Redactor,
  TraceContextRestorer,
  Tracing,
} from '@platform/observability';
import { CallOutcomeFactory, FailureClassifier } from '@platform/primitives';
import type { TransactionManager } from '@platform/kernel';
import type { CallMeta } from '../../../transport/call-meta.js';
import { OperationResolver } from '../../../contract/operation-resolver.js';
import { PayloadLimit } from '../../../contract/payload-limit.js';
import { HandlerOutcomeChecker } from '../../handler-outcome-checker.js';
import { IdempotencyGate } from '../../idempotency-gate.js';
import { InternalRouter } from '../../internal-router.js';
import { OperationDispatcher } from '../../operation-dispatcher.js';
import type { ProcessedOperationStore } from '../../processed-operation-store.js';
import { UnitOfWorkRunner } from '../../unit-of-work-runner.js';
import { RecordingProcessedOperationStore } from './recording-processed-operation-store.js';

/** Options of the server harness. */
export interface ServerHarnessOptions {
  readonly clock?: FixedClock;
  readonly transactions?: Pick<TransactionManager, 'runInTransaction'>;
  readonly leaseMarginMs?: number;
  readonly minLeaseMs?: number;
  readonly maxPayloadBytes?: number;
  readonly store?: ProcessedOperationStore;
  readonly keeper?: ClaimKeeperOptions;
}

/**
 * Full internal API server wired in memory for tests:
 * router, dispatcher, gate, runner and store. The collaborators are
 * public properties because the tests inspect them.
 */
export class ServerHarness {
  static readonly OUT_OF_STOCK = 'STOCK.RESERVE.OUT_OF_STOCK';

  readonly clock: FixedClock;
  readonly store: ProcessedOperationStore;
  readonly outcomes = new CallOutcomeFactory(new FailureClassifier());
  readonly payload: PayloadLimit;
  readonly gate: IdempotencyGate;
  readonly checker: HandlerOutcomeChecker;
  readonly runner: UnitOfWorkRunner;
  readonly resolver = new OperationResolver();
  readonly tracing = new Tracing(new Redactor());
  readonly restorer = new TraceContextRestorer(this.tracing);
  readonly dispatcher: OperationDispatcher;
  readonly router: InternalRouter;

  constructor(options: ServerHarnessOptions = {}) {
    this.clock =
      options.clock ?? new FixedClock(new Date('2026-01-01T00:00:00.000Z'));
    this.store =
      options.store ??
      new RecordingProcessedOperationStore(
        this.clock,
        new SequentialIdGenerator(),
      );
    this.payload = new PayloadLimit(options.maxPayloadBytes);
    this.gate = new IdempotencyGate(this.store, this.outcomes, {
      ...(options.leaseMarginMs !== undefined && {
        leaseMarginMs: options.leaseMarginMs,
      }),
      ...(options.minLeaseMs !== undefined && {
        minLeaseMs: options.minLeaseMs,
      }),
    });
    this.checker = new HandlerOutcomeChecker(this.payload);
    this.runner = new UnitOfWorkRunner(
      this.gate,
      this.checker,
      this.outcomes,
      options.transactions,
    );
    this.dispatcher = new OperationDispatcher(
      this.payload,
      this.gate,
      this.runner,
      this.clock,
      this.outcomes,
      new ClaimKeeper(this.store, this.clock, options.keeper ?? {}),
      new CompensationTombstones(this.store),
    );
    this.router = new InternalRouter(
      this.resolver,
      this.dispatcher,
      this.tracing,
      this.restorer,
    );
  }

  /**
   * Lets pending continuations run (in memory there is no I/O): when it
   * returns, a call has already claimed its key or reached its handler.
   */
  async settle(): Promise<void> {
    await new Promise<void>((resolve) => setImmediate(resolve));
  }

  /** Returns call metadata with a one-second deadline from the harness clock. */
  meta(idempotencyKey: string, overrides: Partial<CallMeta> = {}): CallMeta {
    return {
      idempotencyKey,
      timeoutMs: 1000,
      deadline: this.clock.now().getTime() + 1000,
      ...overrides,
    };
  }
}

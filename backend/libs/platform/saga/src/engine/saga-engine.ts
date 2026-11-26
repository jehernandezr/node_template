import type { Clock, IdGenerator, TransactionManager } from '@platform/kernel';
import type {
  RequestContextStore,
  TraceContextRestorer,
} from '@platform/observability';
import type { SagaRegistry } from '../definition/saga-registry.js';
import { SagaError } from '../errors/saga-error.js';
import { SagaErrorCode } from '../errors/saga-error-code.enum.js';
import type { SagaCallContext } from '../model/saga-call-context.js';
import type { SagaEventListener } from '../model/saga-event.js';
import { SagaInstance } from '../model/saga-instance.js';
import { SagaPayload } from '../model/saga-payload.js';
import { SagaStatus } from '../model/saga-status.enum.js';
import { StepDirection } from '../model/step-direction.enum.js';
import { StepLog } from '../model/step-log.js';
import type { SagaStore } from '../store/saga-store.js';
import type { CompensationRunner } from './compensation-runner.js';
import type { LeaseKeeper } from './lease-keeper.js';
import type { SagaEventPublisher } from './saga-event-publisher.js';
import { SagaEventKinds } from './saga-event-kinds.js';
import type { SagaRun } from './saga-run.js';
import type { StartOptions } from './start-options.js';
import type { StepExecutor } from './step-executor.js';

/** Collaborators of `SagaEngine`. */
export interface SagaEngineDeps {
  readonly store: SagaStore;
  readonly registry: SagaRegistry;
  readonly leases: LeaseKeeper;
  readonly executor: StepExecutor;
  readonly compensations: CompensationRunner;
  readonly events: SagaEventPublisher;
  readonly clock: Clock;
  readonly ids: IdGenerator;
  readonly restorer: TraceContextRestorer;
  /** Without it, the calls' context is only what `StartOptions` passes. */
  readonly requestContext?: RequestContextStore;
  /** With it, a saga started inside an open transaction runs after the commit. */
  readonly transactions?: TransactionManager;
}

/**
 * Engine facade: starts and resumes sagas. Each attempt persists its
 * intent before calling the operation and its result together with the next
 * state; every write is guarded by the lease token and the version.
 * The work of each step belongs to `StepExecutor` and `CompensationRunner`.
 */
export class SagaEngine {
  constructor(private readonly deps: SagaEngineDeps) {}

  /** Subscribes an event listener. Returns the function that removes it. */
  onEvent(listener: SagaEventListener): () => void {
    return this.deps.events.subscribe(listener);
  }

  /**
   * Creates an instance and runs it until it pauses or finishes. The lease already
   * belongs to this run. With an existing `idempotencyKey` it returns that instance.
   * Inside an open transaction the instance is created with it and returned in `Running`, and the steps run in an
   * `afterCommit` hook, because a remote call made inside a transaction that is later rolled back would leave effects
   * without a log to compensate them. The transaction manager awaits that hook, so the caller's transaction returns
   * only once the saga pauses or finishes. If the transaction rolls back, the saga does not exist.
   * @throws SagaError `UnknownDefinition`, `InvalidState` (non-JSON state), `IdempotencyKeyConflict`.
   */
  async start(
    type: string,
    initialState: unknown,
    options: StartOptions = {},
  ): Promise<SagaInstance> {
    const { store, leases, clock, ids } = this.deps;
    this.deps.registry.get(type);
    SagaPayload.assertSerializable(initialState);
    const context = this.contextOf(options);
    SagaPayload.assertSerializable(context);
    const digest = SagaPayload.digest(initialState);
    const key = options.idempotencyKey ?? null;
    if (key !== null) {
      const existing = await store.findByIdempotencyKey(key);
      if (existing !== null) {
        return existing.reusableFor(type, digest);
      }
    }
    const now = clock.now();
    const run = leases.newRun(options.sagaId ?? ids.next().toString());
    const { deadlineMs } = options;
    const instance = SagaInstance.start({
      id: run.sagaId,
      type,
      idempotencyKey: key,
      state: SagaPayload.clone(initialState),
      inputDigest: digest,
      context,
      leaseToken: run.token,
      leaseUntil: leases.leaseUntil(now),
      deadlineAt:
        deadlineMs === undefined ? null : new Date(now.getTime() + deadlineMs),
      now,
    });
    try {
      await store.create(instance);
    } catch (error) {
      const raced =
        key !== null &&
        error instanceof SagaError &&
        error.code === SagaErrorCode.DuplicateSaga
          ? await store.findByIdempotencyKey(key)
          : null;
      if (raced === null) {
        throw error;
      }
      return raced.reusableFor(type, digest);
    }
    const transactions = this.deps.transactions;
    if (transactions?.isInTransaction() === true) {
      // If the run fails after the commit, the lease expires and `SagaRecoveryJob` resumes it.
      transactions.afterCommit(async () => {
        await this.execute(run);
      });
      return instance;
    }
    return this.execute(run);
  }

  /** Continues a saga from its log. @throws SagaError `NotFound`, `LeaseNotAcquired`, `LeaseLost`. */
  async resume(sagaId: string): Promise<SagaInstance> {
    const run = this.deps.leases.newRun(sagaId);
    await this.deps.leases.acquire(run);
    return this.execute(run);
  }

  private async execute(run: SagaRun): Promise<SagaInstance> {
    const before = await this.load(run.sagaId);
    try {
      await this.drive(run);
    } catch (error) {
      await this.deps.leases.releaseQuietly(run);
      throw error;
    }
    await this.deps.leases.release(run);
    const final = await this.load(run.sagaId);
    // Only a state change made by this run is announced; a resume with no effect is silent.
    const kind = SagaEventKinds.of(final.status);
    if (kind !== undefined && final.status !== before.status) {
      this.deps.events.publish(kind, final);
    }
    return final;
  }

  private async drive(run: SagaRun): Promise<void> {
    const { store, registry, executor, compensations } = this.deps;
    let instance = await this.load(run.sagaId);
    const compiled = registry.get(instance.type);
    let firstAttempt = true;
    // A `Suspended` instance is retried only by the first attempt; the
    // following ones stop at the next pause so the caller decides when to come back.
    while (
      !instance.isFinished() &&
      (instance.status !== SagaStatus.Suspended || firstAttempt)
    ) {
      const steps = StepLog.of(await store.steps(instance.id));
      instance =
        instance.direction === StepDirection.Forward
          ? await executor.run(run, instance, compiled, steps)
          : await compensations.run(run, instance, compiled, steps);
      firstAttempt = false;
    }
  }

  /** Whatever `StartOptions` does not provide comes from the current request and the active span: the saga continues on behalf of whoever started it. */
  private contextOf(options: StartOptions): SagaCallContext {
    const request = this.deps.requestContext?.current();
    const tenantId = options.context?.tenantId ?? request?.tenantId;
    const actorId = options.context?.actorId ?? request?.actorId;
    const traceparent =
      options.context?.traceparent ?? this.deps.restorer.current();
    return {
      ...(tenantId !== undefined && { tenantId }),
      ...(actorId !== undefined && { actorId }),
      ...(traceparent !== undefined && { traceparent }),
    };
  }

  private async load(sagaId: string): Promise<SagaInstance> {
    const instance = await this.deps.store.get(sagaId);
    if (instance === null) {
      throw new SagaError(SagaErrorCode.NotFound, `Saga ${sagaId} not found`);
    }
    return instance;
  }
}

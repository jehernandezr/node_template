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

/** Colaboradores de `SagaEngine`. */
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
  /** Sin él, el contexto de las llamadas es solo el que pasa `StartOptions`. */
  readonly requestContext?: RequestContextStore;
  /** Con él, una saga arrancada dentro de una transacción abierta corre después del commit. */
  readonly transactions?: TransactionManager;
}

/**
 * Fachada del motor: arranca y retoma sagas. Cada intento persiste su
 * intención antes de llamar a la operación y su resultado junto con el estado
 * siguiente; toda escritura va protegida por el token del lease y la versión.
 * El trabajo de cada paso es de `StepExecutor` y de `CompensationRunner`.
 */
export class SagaEngine {
  constructor(private readonly deps: SagaEngineDeps) {}

  /** Suscribe un oyente de eventos. Devuelve la función que lo retira. */
  onEvent(listener: SagaEventListener): () => void {
    return this.deps.events.subscribe(listener);
  }

  /**
   * Crea una instancia y la corre hasta que se pause o termine. El lease ya es
   * de esta corrida. Con una `idempotencyKey` existente devuelve esa instancia.
   * Dentro de una transacción abierta la instancia se crea con ella y se
   * devuelve en `Running`: los pasos corren tras el commit, porque una llamada
   * remota hecha dentro de una transacción que luego se deshace dejaría efectos
   * sin bitácora que los compense. Si la transacción se deshace, la saga no existe.
   * @throws SagaError `UnknownDefinition`, `InvalidState` (estado no JSON), `IdempotencyKeyConflict`.
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
      // Si la corrida falla tras el commit, el lease vence y la retoma `SagaRecoveryJob`.
      transactions.afterCommit(async () => {
        await this.execute(run);
      });
      return instance;
    }
    return this.execute(run);
  }

  /** Continúa una saga desde su bitácora. @throws SagaError `NotFound`, `LeaseNotAcquired`, `LeaseLost`. */
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
    // Solo se anuncia un cambio de estado hecho por esta corrida; un resume sin efecto es silencioso.
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
    // Una instancia `Suspended` la reintenta solo el primer intento; los
    // siguientes paran en la próxima pausa para que quien llama decida cuándo volver.
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

  /** Lo que no da `StartOptions` sale de la petición en curso y del span activo: la saga continúa a quien la arrancó. */
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

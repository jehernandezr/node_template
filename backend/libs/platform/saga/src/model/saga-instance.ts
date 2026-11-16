import type { CompiledSaga } from '../definition/compiled-saga.js';
import { SagaError } from '../errors/saga-error.js';
import { SagaErrorCode } from '../errors/saga-error-code.enum.js';
import type { SagaCallContext } from './saga-call-context.js';
import type { SagaInstanceProps } from './saga-instance-props.js';
import { SagaStatus } from './saga-status.enum.js';
import { StepDirection } from './step-direction.enum.js';
import { StepStatus } from './step-status.enum.js';
import type { StartSagaInstance } from './start-saga-instance.js';
import type { StepLog } from './step-log.js';
import type { SuspendPolicy } from './suspend-policy.js';

/** Estados que terminan la saga: ninguna corrida la retoma. */
const FINISHED: ReadonlySet<SagaStatus> = new Set([
  SagaStatus.Completed,
  SagaStatus.Compensated,
  SagaStatus.CompensationFailed,
  SagaStatus.RequiresIntervention,
]);

/**
 * Agregado de la saga. Inmutable: cada transición es un método puro que
 * devuelve una instancia nueva, sin E/S. El motor decide cuándo aplicarlas y
 * el `SagaStore` las persiste.
 */
export class SagaInstance {
  private constructor(private readonly data: SagaInstanceProps) {}

  /** Reconstruye la instancia con lo que guardó el almacén. */
  static rehydrate(props: SagaInstanceProps): SagaInstance {
    return new SagaInstance(props);
  }

  /** Instancia nueva en `Running`, en el paso 0 hacia delante, versión 0 y con el lease de la corrida que arranca. */
  static start(input: StartSagaInstance): SagaInstance {
    return new SagaInstance({
      id: input.id,
      type: input.type,
      idempotencyKey: input.idempotencyKey,
      status: SagaStatus.Running,
      state: input.state,
      currentStep: 0,
      direction: StepDirection.Forward,
      version: 0,
      leaseToken: input.leaseToken,
      leaseUntil: input.leaseUntil,
      nextAttemptAt: null,
      attempts: 0,
      suspendedSince: null,
      deadlineAt: input.deadlineAt,
      lastErrorCode: null,
      lastErrorDetail: null,
      context: SagaInstance.normalizeContext(input.context),
      inputDigest: input.inputDigest,
      createdAt: input.now,
      updatedAt: input.now,
    });
  }

  /** Solo los campos presentes: así el almacén no guarda claves `undefined` y una saga sin contexto queda en `null`. */
  private static normalizeContext(
    context: SagaCallContext | undefined,
  ): SagaCallContext | null {
    const kept: { tenantId?: string; actorId?: string; traceparent?: string } =
      {};
    if (context?.tenantId !== undefined) {
      kept.tenantId = context.tenantId;
    }
    if (context?.actorId !== undefined) {
      kept.actorId = context.actorId;
    }
    if (context?.traceparent !== undefined) {
      kept.traceparent = context.traceparent;
    }
    return Object.keys(kept).length === 0 ? null : kept;
  }

  /** Los campos persistentes, para el almacén. */
  toProps(): SagaInstanceProps {
    return this.data;
  }

  get id(): string {
    return this.data.id;
  }
  get type(): string {
    return this.data.type;
  }
  get idempotencyKey(): string | null {
    return this.data.idempotencyKey;
  }
  get status(): SagaStatus {
    return this.data.status;
  }
  get state(): unknown {
    return this.data.state;
  }
  get currentStep(): number {
    return this.data.currentStep;
  }
  get direction(): StepDirection {
    return this.data.direction;
  }
  get version(): number {
    return this.data.version;
  }
  get leaseToken(): string | null {
    return this.data.leaseToken;
  }
  get leaseUntil(): Date | null {
    return this.data.leaseUntil;
  }
  get nextAttemptAt(): Date | null {
    return this.data.nextAttemptAt;
  }
  get attempts(): number {
    return this.data.attempts;
  }
  get suspendedSince(): Date | null {
    return this.data.suspendedSince;
  }
  get deadlineAt(): Date | null {
    return this.data.deadlineAt;
  }
  get lastErrorCode(): string | null {
    return this.data.lastErrorCode;
  }
  get lastErrorDetail(): string | null {
    return this.data.lastErrorDetail;
  }
  get context(): SagaCallContext | null {
    return this.data.context;
  }
  get inputDigest(): string {
    return this.data.inputDigest;
  }
  get createdAt(): Date {
    return this.data.createdAt;
  }
  get updatedAt(): Date {
    return this.data.updatedAt;
  }

  /** Tenant dueño de la saga (el de su contexto), o `null`. */
  get tenantId(): string | null {
    return this.data.context?.tenantId ?? null;
  }

  isFinished(): boolean {
    return FINISHED.has(this.data.status);
  }

  /** Si el plazo de la saga ya pasó en `now`. */
  deadlinePassed(now: Date): boolean {
    return (
      this.data.deadlineAt !== null &&
      now.getTime() >= this.data.deadlineAt.getTime()
    );
  }

  /**
   * Esta instancia, hallada por su llave de idempotencia, como resultado de un
   * arranque repetido: solo si es del mismo tipo y con el mismo estado inicial.
   * @throws SagaError `IdempotencyKeyConflict` si la llave ya la usa otra saga u otra entrada.
   */
  reusableFor(type: string, inputDigest: string): SagaInstance {
    if (this.data.type !== type) {
      throw new SagaError(
        SagaErrorCode.IdempotencyKeyConflict,
        `Idempotency key is already used by a "${this.data.type}" saga, not "${type}"`,
      );
    }
    if (this.data.inputDigest !== inputDigest) {
      throw new SagaError(
        SagaErrorCode.IdempotencyKeyConflict,
        `Idempotency key is already used by saga ${this.data.id} with a different input`,
        { details: { sagaId: this.data.id } },
      );
    }
    return this;
  }

  /** La misma instancia con otra versión; lo usa el almacén al guardar. */
  withVersion(version: number): SagaInstance {
    return new SagaInstance({ ...this.data, version });
  }

  /** La misma instancia con otro lease; lo usa el almacén al tomarlo, renovarlo o soltarlo. */
  withLease(leaseToken: string | null, leaseUntil: Date | null): SagaInstance {
    return new SagaInstance({ ...this.data, leaseToken, leaseUntil });
  }

  /** Marca el despacho de un intento: `Running` hacia delante, `Compensating` al deshacer. */
  recordDispatch(direction: StepDirection, now: Date): SagaInstance {
    return this.next(
      {
        status:
          direction === StepDirection.Forward
            ? SagaStatus.Running
            : SagaStatus.Compensating,
        nextAttemptAt: null,
      },
      now,
    );
  }

  /** Paso `index` completado: aplica `state`, avanza o termina en `Completed` y limpia el error de intentos previos. */
  completeStep(
    compiled: CompiledSaga<unknown>,
    index: number,
    state: unknown,
    now: Date,
  ): SagaInstance {
    const next = index + 1;
    const done = next >= compiled.steps.length;
    return this.next(
      {
        state,
        status: done ? SagaStatus.Completed : SagaStatus.Running,
        currentStep: done ? index : next,
        attempts: 0,
        suspendedSince: null,
        nextAttemptAt: null,
        lastErrorCode: null,
        lastErrorDetail: null,
      },
      now,
    );
  }

  /**
   * Empieza a compensar desde `from` (inclusive) hacia abajo. Termina en
   * `Compensated` de una vez si nada necesita deshacerse.
   */
  startCompensation(
    compiled: CompiledSaga<unknown>,
    steps: StepLog,
    from: number,
    code: string,
    detail: string | null,
    now: Date,
  ): SagaInstance {
    const next = this.compensableFrom(compiled, steps, from);
    return this.next(
      {
        direction: StepDirection.Compensate,
        status:
          next === null ? SagaStatus.Compensated : SagaStatus.Compensating,
        currentStep: next ?? this.data.currentStep,
        attempts: 0,
        suspendedSince: null,
        nextAttemptAt: null,
        lastErrorCode: code,
        lastErrorDetail: detail,
      },
      now,
    );
  }

  /** Pasa al siguiente paso por deshacer bajo `from`, conservando el error que inició la compensación. */
  completeCompensation(
    compiled: CompiledSaga<unknown>,
    steps: StepLog,
    from: number,
    now: Date,
  ): SagaInstance {
    const next = this.compensableFrom(compiled, steps, from);
    return this.next(
      {
        status:
          next === null ? SagaStatus.Compensated : SagaStatus.Compensating,
        currentStep: next ?? this.data.currentStep,
        attempts: 0,
        suspendedSince: null,
        nextAttemptAt: null,
      },
      now,
    );
  }

  /** Pausa para reintentar, o exige intervención cuando se superan los topes de suspensión. */
  suspend(
    code: string,
    detail: string | null,
    now: Date,
    policy: SuspendPolicy,
  ): SagaInstance {
    const attempts = this.data.attempts + 1;
    // El inicio de la suspensión se conserva aunque se rinda, para que la
    // instancia muestre cuánto tiempo llevaba fallando el paso.
    const since = this.data.suspendedSince ?? now;
    const exhausted =
      attempts > policy.maxSuspendAttempts ||
      now.getTime() - since.getTime() >= policy.maxSuspendAgeMs;
    return this.next(
      {
        status: exhausted
          ? SagaStatus.RequiresIntervention
          : SagaStatus.Suspended,
        attempts,
        suspendedSince: since,
        nextAttemptAt: exhausted
          ? null
          : new Date(now.getTime() + policy.backoff(attempts)),
        lastErrorCode: code,
        lastErrorDetail: detail,
      },
      now,
    );
  }

  /** Detiene la saga hasta que decida una persona: `RequiresIntervention` o `CompensationFailed`. */
  finish(
    status: SagaStatus.RequiresIntervention | SagaStatus.CompensationFailed,
    code: string,
    detail: string | null,
    now: Date,
  ): SagaInstance {
    return this.next(
      {
        status,
        nextAttemptAt: null,
        suspendedSince: null,
        lastErrorCode: code,
        lastErrorDetail: detail,
      },
      now,
    );
  }

  /** Copia con `patch` aplicado y la fecha de la última escritura en `now`. */
  private next(patch: Partial<SagaInstanceProps>, now: Date): SagaInstance {
    return new SagaInstance({ ...this.data, ...patch, updatedAt: now });
  }

  /**
   * Primer paso por deshacer en `from` o por debajo, o `null` si nada necesita
   * deshacerse. Los pasos de solo lectura no tienen compensación y se saltan.
   */
  private compensableFrom(
    compiled: CompiledSaga<unknown>,
    steps: StepLog,
    from: number,
  ): number | null {
    for (let index = from; index >= 0; index--) {
      if (compiled.steps[index]?.compensationOperationId === null) {
        continue;
      }
      const entry = steps.find(index, StepDirection.Forward);
      if (
        entry?.status === StepStatus.Succeeded ||
        entry?.status === StepStatus.Dispatched ||
        entry?.status === StepStatus.Uncertain
      ) {
        return index;
      }
    }
    return null;
  }
}

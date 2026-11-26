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

/** States that end the saga: no run resumes it. */
const FINISHED: ReadonlySet<SagaStatus> = new Set([
  SagaStatus.Completed,
  SagaStatus.Compensated,
  SagaStatus.CompensationFailed,
  SagaStatus.RequiresIntervention,
]);

/**
 * Saga aggregate. Immutable: each transition is a pure method that
 * returns a new instance, with no I/O. The engine decides when to apply them and
 * the `SagaStore` persists them.
 */
export class SagaInstance {
  private constructor(private readonly data: SagaInstanceProps) {}

  /** Rebuilds the instance from what the store saved. */
  static rehydrate(props: SagaInstanceProps): SagaInstance {
    return new SagaInstance(props);
  }

  /** New instance in `Running`, at step 0 forward, version 0 and with the lease of the starting run. */
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

  /** Only the present fields: so the store does not save `undefined` keys and a saga without context ends up as `null`. */
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

  /** The persistent fields, for the store. */
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

  /** Tenant that owns the saga (the one in its context), or `null`. */
  get tenantId(): string | null {
    return this.data.context?.tenantId ?? null;
  }

  isFinished(): boolean {
    return FINISHED.has(this.data.status);
  }

  /** Whether the saga deadline already passed at `now`. */
  deadlinePassed(now: Date): boolean {
    return (
      this.data.deadlineAt !== null &&
      now.getTime() >= this.data.deadlineAt.getTime()
    );
  }

  /**
   * This instance, found by its idempotency key, as the result of a
   * repeated start: only if it is of the same type and has the same initial state.
   * @throws SagaError `IdempotencyKeyConflict` if the key is already used by another saga or another input.
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

  /** The same instance with another version; the store uses it when saving. */
  withVersion(version: number): SagaInstance {
    return new SagaInstance({ ...this.data, version });
  }

  /** The same instance with another lease; the store uses it when taking, renewing or releasing it. */
  withLease(leaseToken: string | null, leaseUntil: Date | null): SagaInstance {
    return new SagaInstance({ ...this.data, leaseToken, leaseUntil });
  }

  /** Marks the dispatch of an attempt: `Running` going forward, `Compensating` when undoing. */
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

  /** Step `index` completed: applies `state`, advances or ends in `Completed` and clears the error from previous attempts. */
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
   * Starts compensating from `from` (inclusive) downward. Ends in
   * `Compensated` at once if nothing needs to be undone.
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

  /** Moves to the next step to undo below `from`, keeping the error that started the compensation. */
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

  /**
   * Pauses to retry, or requires intervention when the suspension limits are exceeded.
   * The start of the suspension is kept even when giving up, so the instance shows how long the step had been failing.
   */
  suspend(
    code: string,
    detail: string | null,
    now: Date,
    policy: SuspendPolicy,
  ): SagaInstance {
    const attempts = this.data.attempts + 1;
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

  /**
   * Short pause after a call in which the participant made progress: tries again with the first wait of
   * `policy` and without spending suspensions, which are counted again from zero.
   */
  continueAfterProgress(
    code: string,
    detail: string | null,
    now: Date,
    policy: SuspendPolicy,
  ): SagaInstance {
    return this.next(
      {
        status: SagaStatus.Suspended,
        attempts: 0,
        suspendedSince: null,
        nextAttemptAt: new Date(now.getTime() + policy.backoff(1)),
        lastErrorCode: code,
        lastErrorDetail: detail,
      },
      now,
    );
  }

  /** Stops the saga until a person decides: `RequiresIntervention` or `CompensationFailed`. */
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

  /** Copy with `patch` applied and the last write date set to `now`. */
  private next(patch: Partial<SagaInstanceProps>, now: Date): SagaInstance {
    return new SagaInstance({ ...this.data, ...patch, updatedAt: now });
  }

  /**
   * First step to undo at `from` or below, or `null` if nothing needs
   * to be undone. Read-only steps have no compensation and are skipped.
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

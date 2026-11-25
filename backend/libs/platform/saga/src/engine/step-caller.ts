import { context as otelContext, SpanKind } from '@opentelemetry/api';
import type { Clock } from '@platform/kernel';
import type {
  LoggerPort,
  TraceContextRestorer,
  Tracing,
} from '@platform/observability';
import type { CallOutcomeFactory } from '@platform/primitives';
import {
  CallOutcome,
  CallOutcomeKind,
  Deadline,
  DeadlineExceededError,
} from '@platform/primitives';
import { SagaErrorCode } from '../errors/saga-error-code.enum.js';
import type { OperationInvoker } from '../invoker/operation-invoker.js';
import type { SagaCallContext } from '../model/saga-call-context.js';
import type { SagaInstance } from '../model/saga-instance.js';
import { SagaPayload } from '../model/saga-payload.js';
import { SagaStatus } from '../model/saga-status.enum.js';
import type { StepLogEntry } from '../model/step-log-entry.js';
import { StepKey } from '../model/step-key.js';
import { StepStatus } from '../model/step-status.enum.js';
import { ErrorDetail } from '../model/error-detail.js';
import type { SagaStore } from '../store/saga-store.js';
import { SagaSpan } from './saga-span.enum.js';
import { SagaSpanAttribute } from './saga-span-attribute.enum.js';
import type { LeaseKeeper } from './lease-keeper.js';
import type { SagaRun } from './saga-run.js';
import type { SagaSettings } from './saga-settings.js';
import {
  StepCallResult,
  type StepCall,
  type StepTarget,
} from './step-attempt.js';

/** Collaborators of `StepCaller`. */
export interface StepCallerDeps {
  readonly store: SagaStore;
  readonly invoker: OperationInvoker;
  readonly leases: LeaseKeeper;
  readonly settings: SagaSettings;
  readonly clock: Clock;
  readonly tracing: Tracing;
  readonly restorer: TraceContextRestorer;
  /** Classifies what the invoker throws. */
  readonly outcomes: CallOutcomeFactory;
  readonly logger?: LoggerPort;
}

/** A value built for the input, or the reason it could not be built. */
type Built =
  | { readonly ok: true; readonly value: unknown }
  | { readonly ok: false; readonly error: unknown; readonly detail: string };

/** What was written on dispatch: the log entry and the instance with its new version. */
interface Dispatched {
  readonly dispatched: StepLogEntry;
  readonly current: SagaInstance;
}

/**
 * Mechanics shared by forward steps and compensations: writes the
 * intent before calling (write-ahead), calls the operation through the
 * `OperationInvoker` inside a `Deadline` and a span, and performs the
 * writes guarded by the lease token and the version.
 */
export class StepCaller {
  /** Reason for the `protocolViolation` when the invoker returns something that is not a `CallOutcome`. */
  static readonly INVALID_INVOKER_RESULT = 'invalid-invoker-result';

  private static readonly OUTCOME_KINDS: ReadonlySet<unknown> = new Set(
    Object.values(CallOutcomeKind),
  );

  constructor(private readonly deps: StepCallerDeps) {}

  /**
   * Dispatches one attempt of a step in either direction and calls the operation.
   * - A `Dispatched` entry (the process died after the dispatch) is invoked again as is.
   * - Any other recorded attempt is retried with its saved input, never a rebuilt one, with the same idempotency key.
   * - A first attempt builds its input with `target.buildInput` on a copy of the state; if it is not built or is not JSON, it writes `RequiresIntervention` with `InputBuildFailed` and returns `Halted`.
   * - Before calling, it renews the lease past the step `Deadline` (`settings.maxStepDurationMs`); the call runs in a `SagaSpan.Step` span that is a child of the trace saved in the entry or, if there is none, of the instance trace.
   * - If the deadline expires, the signal is aborted and the result is `uncertain` with the reason `timed out after N ms`; a thrown error is classified with `outcomes.fromError`; a result that is not a `CallOutcome` is `protocolViolation` with the reason `invalid-invoker-result`.
   */
  call(
    run: SagaRun,
    instance: SagaInstance,
    target: StepTarget,
  ): Promise<StepCall> {
    // The span inherits the trace in which the step was first dispatched, so
    // a retry from another node lands in the same trace.
    const parent =
      target.entry?.traceparent ?? instance.context?.traceparent ?? undefined;
    return otelContext.with(
      this.deps.restorer.contextFrom(parent, otelContext.active()),
      () =>
        this.deps.tracing.withSpan(
          SagaSpan.Step,
          () =>
            this.interior(
              run,
              instance,
              target,
              this.deps.restorer.current() ?? parent,
            ),
          {
            kind: SpanKind.INTERNAL,
            attributes: {
              [SagaSpanAttribute.SagaType]: instance.type,
              [SagaSpanAttribute.SagaId]: instance.id,
              [SagaSpanAttribute.StepIndex]: target.step.index,
              [SagaSpanAttribute.Direction]: target.direction,
              [SagaSpanAttribute.Operation]: target.operationId,
            },
          },
        ),
    );
  }

  /** Guarded write of a transition, with its journal entry if any. Returns the saved instance. */
  commit(
    run: SagaRun,
    instance: SagaInstance,
    step?: StepLogEntry,
  ): Promise<SagaInstance> {
    return this.deps.store.commitStep({
      instance,
      expectedVersion: instance.version,
      leaseToken: run.token,
      ...(step !== undefined && { step }),
    });
  }

  /** The entry with its result: status, error code, output and `finishedAt` from the clock. */
  finish(
    dispatched: StepLogEntry,
    status: StepStatus,
    errorCode: string | null,
    output?: unknown,
  ): StepLogEntry {
    return {
      ...dispatched,
      status,
      output,
      errorCode,
      finishedAt: this.deps.clock.now(),
    };
  }

  private async interior(
    run: SagaRun,
    instance: SagaInstance,
    target: StepTarget,
    traceparent: string | undefined,
  ): Promise<StepCall> {
    let pending: Dispatched | { readonly halted: SagaInstance };
    if (target.entry?.status === StepStatus.Dispatched) {
      pending = { dispatched: target.entry, current: instance };
    } else {
      pending = await this.dispatch(run, instance, target, traceparent);
    }
    if ('halted' in pending) {
      return { result: StepCallResult.Halted, instance: pending.halted };
    }
    const { dispatched, current } = pending;
    const deadline = Deadline.after(
      this.deps.settings.maxStepDurationMs,
      this.deps.clock,
    );
    await this.deps.leases.renewPast(run, deadline);
    const context: SagaCallContext = {
      ...current.context,
      ...(traceparent !== undefined && { traceparent }),
    };
    const outcome = await this.invoke(
      target.operationId,
      dispatched.input,
      dispatched.idempotencyKey,
      deadline,
      context,
    );
    return {
      result: StepCallResult.Called,
      attempt: { instance: current, dispatched, outcome },
    };
  }

  /**
   * Writes the dispatch. A first attempt builds its input; any other
   * attempt reuses the saved one, so the participant receives the same
   * input and the same key.
   */
  private async dispatch(
    run: SagaRun,
    instance: SagaInstance,
    target: StepTarget,
    traceparent: string | undefined,
  ): Promise<Dispatched | { readonly halted: SagaInstance }> {
    const { step, direction, operationId, entry } = target;
    let input: unknown;
    if (entry === undefined) {
      const built = this.buildSerializable(() =>
        target.buildInput(SagaPayload.clone(instance.state)),
      );
      if (!built.ok) {
        this.deps.logger?.error('saga step input could not be built', {
          sagaId: instance.id,
          sagaType: instance.type,
          stepIndex: step.index,
          direction,
          error: built.error,
        });
        const halted = await this.commit(
          run,
          instance.finish(
            SagaStatus.RequiresIntervention,
            SagaErrorCode.InputBuildFailed,
            built.detail,
            this.deps.clock.now(),
          ),
        );
        return { halted };
      }
      input = built.value;
    } else {
      input = entry.input;
    }
    const now = this.deps.clock.now();
    const dispatched: StepLogEntry = {
      sagaId: instance.id,
      stepIndex: step.index,
      operationId,
      direction,
      status: StepStatus.Dispatched,
      idempotencyKey: StepKey.of(instance.id, step.index, direction),
      input,
      output: undefined,
      errorCode: null,
      traceparent: entry?.traceparent ?? traceparent ?? null,
      startedAt: now,
      finishedAt: null,
    };
    const current = await this.deps.store.dispatchStep({
      instance: instance.recordDispatch(direction, now),
      expectedVersion: instance.version,
      leaseToken: run.token,
      step: dispatched,
    });
    return { dispatched, current };
  }

  /**
   * Calls the operation within its deadline. An expired deadline is an uncertain
   * result: the operation may have applied even though its response is no longer awaited.
   */
  private async invoke(
    operationId: string,
    input: unknown,
    idempotencyKey: string,
    deadline: Deadline,
    context: SagaCallContext,
  ): Promise<CallOutcome<unknown>> {
    try {
      const result = await deadline.race((signal) =>
        this.deps.invoker.invoke(operationId, input, idempotencyKey, {
          signal,
          deadline,
          context,
        }),
      );
      return this.checkedOutcome(result);
    } catch (error) {
      if (error instanceof DeadlineExceededError) {
        return CallOutcome.uncertain(
          `timed out after ${this.deps.settings.maxStepDurationMs} ms`,
        );
      }
      return this.deps.outcomes.fromError(error);
    }
  }

  private checkedOutcome(result: unknown): CallOutcome<unknown> {
    const kind =
      typeof result === 'object' && result !== null
        ? (result as { kind?: unknown }).kind
        : undefined;
    return StepCaller.OUTCOME_KINDS.has(kind)
      ? (result as CallOutcome<unknown>)
      : CallOutcome.protocolViolation(StepCaller.INVALID_INVOKER_RESULT);
  }

  private buildSerializable(build: () => unknown): Built {
    try {
      const value = build();
      SagaPayload.assertSerializable(value);
      return { ok: true, value: SagaPayload.clone(value) };
    } catch (error) {
      return { ok: false, error, detail: ErrorDetail.of(error) };
    }
  }
}

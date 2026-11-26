import type { Clock } from '@platform/kernel';
import type { LoggerPort } from '@platform/observability';
import type { CompiledSaga } from '../definition/compiled-saga.js';
import type { CompiledStep } from '../definition/compiled-step.js';
import { SagaError } from '../errors/saga-error.js';
import { SagaErrorCode } from '../errors/saga-error-code.enum.js';
import { ErrorDetail } from '../model/error-detail.js';
import type { SagaInstance } from '../model/saga-instance.js';
import { SagaPayload } from '../model/saga-payload.js';
import { SagaStatus } from '../model/saga-status.enum.js';
import { SagaEventKind } from '../model/saga-event-kind.enum.js';
import { StepDirection } from '../model/step-direction.enum.js';
import type { StepLog } from '../model/step-log.js';
import { StepStatus } from '../model/step-status.enum.js';
import { CallOutcomeKind } from '@platform/primitives';
import type { SagaEventPublisher } from './saga-event-publisher.js';
import type { SagaRun } from './saga-run.js';
import type { SagaSettings } from './saga-settings.js';
import type { StepCaller } from './step-caller.js';
import { type StepAttempt, StepCallResult } from './step-attempt.js';

/** Collaborators of `StepExecutor`. */
export interface StepExecutorDeps {
  readonly caller: StepCaller;
  readonly events: SagaEventPublisher;
  readonly settings: SagaSettings;
  readonly clock: Clock;
  readonly logger?: LoggerPort;
}

/**
 * Runs a forward attempt of the current step and writes its result.
 * Rules (the `CallOutcome` from `@platform/primitives`):
 * - `success`: applies the output with `onSuccess` and advances (`completeStep`).
 * - `business-error`: before the pivot, compensates from the previous step; after it, requires intervention.
 * - `transient-failure` and `uncertain`: suspends and retries with the same key and input until the suspension runs out, and then requires intervention. Before the pivot, a passed saga deadline compensates including the step.
 * - `transient-failure` with a step progress reason (`progressOn`): repeats without spending suspensions.
 * - `protocol-violation`: before the pivot, compensates including the step; after it, requires intervention. Emits `SagaEventKind.ProtocolViolation`.
 */
export class StepExecutor {
  constructor(private readonly deps: StepExecutorDeps) {}

  /**
   * One attempt of step `instance.currentStep`. If the saga deadline already passed
   * and the step is before the pivot, it does not dispatch: it starts compensating (including
   * the step if its entry is `Dispatched` or `Uncertain`) with `DeadlineExceeded`.
   * Returns the written instance.
   * Nothing is dispatched after the deadline, but an uncertain step must still be undone.
   * The clock is read after the call: a step that used up its deadline must see the saga deadline already expired and measure the backoff from that moment.
   * @param run Run that holds the lease.
   * @param instance Saga instance.
   * @param compiled Compiled saga.
   * @param steps Step log.
   * @returns The instance after the step.
   */
  async run(
    run: SagaRun,
    instance: SagaInstance,
    compiled: CompiledSaga<unknown>,
    steps: StepLog,
  ): Promise<SagaInstance> {
    const index = instance.currentStep;
    const step = this.stepAt(compiled, index);
    const entry = steps.find(index, StepDirection.Forward);
    const before = this.deps.clock.now();
    if (index < compiled.pivotIndex && instance.deadlinePassed(before)) {
      const uncertain =
        entry?.status === StepStatus.Dispatched ||
        entry?.status === StepStatus.Uncertain;
      return this.deps.caller.commit(
        run,
        instance.startCompensation(
          compiled,
          steps,
          uncertain ? index : index - 1,
          SagaErrorCode.DeadlineExceeded,
          null,
          before,
        ),
      );
    }
    const call = await this.deps.caller.call(run, instance, {
      step,
      direction: StepDirection.Forward,
      operationId: step.operationId,
      entry,
      buildInput: (state) => step.input(state),
    });
    if (call.result === StepCallResult.Halted) {
      return call.instance;
    }
    const now = this.deps.clock.now();
    return this.settle(run, compiled, steps, call.attempt, now);
  }

  private async settle(
    run: SagaRun,
    compiled: CompiledSaga<unknown>,
    steps: StepLog,
    attempt: StepAttempt,
    now: Date,
  ): Promise<SagaInstance> {
    const { caller } = this.deps;
    const { dispatched, outcome, instance } = attempt;
    const index = dispatched.stepIndex;
    switch (outcome.kind) {
      case CallOutcomeKind.Success: {
        return this.succeed(run, compiled, steps, attempt, now);
      }
      case CallOutcomeKind.BusinessError: {
        const failed = caller.finish(
          dispatched,
          StepStatus.Failed,
          outcome.code,
        );
        const next =
          index >= compiled.pivotIndex
            ? instance.finish(
                SagaStatus.RequiresIntervention,
                outcome.code,
                null,
                now,
              )
            : instance.startCompensation(
                compiled,
                steps.with(failed),
                index - 1,
                outcome.code,
                null,
                now,
              );
        return caller.commit(run, next, failed);
      }
      case CallOutcomeKind.TransientFailure:
        return this.retry(
          run,
          compiled,
          steps,
          attempt,
          SagaErrorCode.TransientFailure,
          outcome.reason,
          now,
        );
      case CallOutcomeKind.Uncertain:
        return this.retry(
          run,
          compiled,
          steps,
          attempt,
          SagaErrorCode.UncertainOutcome,
          outcome.reason,
          now,
        );
      case CallOutcomeKind.ProtocolViolation:
        return this.protocol(
          run,
          compiled,
          steps,
          attempt,
          outcome.reason,
          now,
        );
      default: {
        const unexpected: never = outcome;
        throw new Error(`Unknown call outcome: ${JSON.stringify(unexpected)}`);
      }
    }
  }

  /** Applies the output to the state and advances. An output that is not JSON is a protocol violation. */
  private async succeed(
    run: SagaRun,
    compiled: CompiledSaga<unknown>,
    steps: StepLog,
    attempt: StepAttempt,
    now: Date,
  ): Promise<SagaInstance> {
    const { caller } = this.deps;
    const { dispatched, instance, outcome } = attempt;
    const index = dispatched.stepIndex;
    if (outcome.kind !== CallOutcomeKind.Success) {
      throw new Error('succeed requires a success outcome');
    }
    let output: unknown;
    try {
      output = SagaPayload.clone(outcome.value);
    } catch (error) {
      return this.protocol(
        run,
        compiled,
        steps,
        attempt,
        ErrorDetail.of(error),
        now,
      );
    }
    const finished = caller.finish(
      dispatched,
      StepStatus.Succeeded,
      null,
      output,
    );
    const step = this.stepAt(compiled, index);
    let state: unknown;
    try {
      const draft = SagaPayload.clone(instance.state);
      step.onSuccess(draft, output);
      SagaPayload.assertSerializable(draft);
      state = SagaPayload.clone(draft);
    } catch (error) {
      this.deps.logger?.error('saga onSuccess rule failed', {
        sagaId: instance.id,
        sagaType: instance.type,
        stepIndex: index,
        direction: StepDirection.Forward,
        error,
      });
      return caller.commit(
        run,
        instance.finish(
          SagaStatus.RequiresIntervention,
          SagaErrorCode.StateUpdateFailed,
          ErrorDetail.of(error),
          now,
        ),
        finished,
      );
    }
    return caller.commit(
      run,
      instance.completeStep(compiled, index, state, now),
      finished,
    );
  }

  /**
   * A failure that may or may not have applied and can be retried: suspends and
   * retries with the same key, unless the saga deadline passed
   * before the pivot, in which case the step is also undone.
   */
  private async retry(
    run: SagaRun,
    compiled: CompiledSaga<unknown>,
    steps: StepLog,
    attempt: StepAttempt,
    code: SagaErrorCode,
    detail: string,
    now: Date,
  ): Promise<SagaInstance> {
    const { caller, settings } = this.deps;
    const { dispatched, instance } = attempt;
    const index = dispatched.stepIndex;
    const uncertain = caller.finish(dispatched, StepStatus.Uncertain, code);
    if (index < compiled.pivotIndex && instance.deadlinePassed(now)) {
      return caller.commit(
        run,
        instance.startCompensation(
          compiled,
          steps.with(uncertain),
          index,
          SagaErrorCode.DeadlineExceeded,
          detail,
          now,
        ),
        uncertain,
      );
    }
    const progressed =
      attempt.outcome.kind === CallOutcomeKind.TransientFailure &&
      this.stepAt(compiled, index).progressReasons.has(detail);
    const next = progressed
      ? instance.continueAfterProgress(
          code,
          detail,
          now,
          settings.suspendPolicy(),
        )
      : instance.suspend(code, detail, now, settings.suspendPolicy());
    return caller.commit(run, next, uncertain);
  }

  /**
   * A step whose participant broke the protocol: it may have applied its effect and
   * retrying does not fix it. Before the pivot the saga is undone including the
   * step; after it, a person decides. In both cases an alert is emitted.
   */
  private async protocol(
    run: SagaRun,
    compiled: CompiledSaga<unknown>,
    steps: StepLog,
    attempt: StepAttempt,
    detail: string,
    now: Date,
  ): Promise<SagaInstance> {
    const { caller, events } = this.deps;
    const { dispatched, instance } = attempt;
    const index = dispatched.stepIndex;
    const code = SagaErrorCode.ProtocolViolation;
    const uncertain = caller.finish(dispatched, StepStatus.Uncertain, code);
    const next =
      index < compiled.pivotIndex
        ? instance.startCompensation(
            compiled,
            steps.with(uncertain),
            index,
            code,
            detail,
            now,
          )
        : instance.finish(SagaStatus.RequiresIntervention, code, detail, now);
    const saved = await caller.commit(run, next, uncertain);
    events.publish(SagaEventKind.ProtocolViolation, saved);
    return saved;
  }

  private stepAt(
    compiled: CompiledSaga<unknown>,
    index: number,
  ): CompiledStep<unknown> {
    const step = compiled.steps[index];
    if (step === undefined) {
      throw new SagaError(
        SagaErrorCode.InvalidDefinition,
        `Saga "${compiled.type}" has no step ${index}`,
      );
    }
    return step;
  }
}

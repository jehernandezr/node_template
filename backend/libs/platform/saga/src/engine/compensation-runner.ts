import type { Clock } from '@platform/kernel';
import type { LoggerPort } from '@platform/observability';
import { CallOutcomeKind } from '@platform/primitives';
import type { CompiledSaga } from '../definition/compiled-saga.js';
import { SagaError } from '../errors/saga-error.js';
import { SagaErrorCode } from '../errors/saga-error-code.enum.js';
import type { SagaInstance } from '../model/saga-instance.js';
import { SagaEventKind } from '../model/saga-event-kind.enum.js';
import { SagaStatus } from '../model/saga-status.enum.js';
import { StepDirection } from '../model/step-direction.enum.js';
import { StepLog } from '../model/step-log.js';
import { StepStatus } from '../model/step-status.enum.js';
import type { SagaEventPublisher } from './saga-event-publisher.js';
import type { SagaRun } from './saga-run.js';
import type { SagaSettings } from './saga-settings.js';
import type { StepCaller } from './step-caller.js';
import { type StepAttempt, StepCallResult } from './step-attempt.js';

/** Collaborators of `CompensationRunner`. */
export interface CompensationRunnerDeps {
  readonly caller: StepCaller;
  readonly events: SagaEventPublisher;
  readonly settings: SagaSettings;
  readonly clock: Clock;
  readonly logger?: LoggerPort;
}

/**
 * Runs a compensation attempt of the current step with the input and the
 * output stored in the log (never with process memory). Rules:
 * - `success`: moves to the next step to undo (`completeCompensation`); with none left, `Compensated`.
 * - `business-error`: `CompensationFailed`.
 * - `transient-failure` and `uncertain`: suspends and retries with the same key.
 * - `protocol-violation`: `CompensationFailed` and emits `SagaEventKind.ProtocolViolation`.
 */
export class CompensationRunner {
  constructor(private readonly deps: CompensationRunnerDeps) {}

  /**
   * Makes one attempt to compensate step `instance.currentStep`.
   * @throws SagaError `InvalidState` if the step has no compensation operation or no forward input.
   */
  async run(
    run: SagaRun,
    instance: SagaInstance,
    compiled: CompiledSaga<unknown>,
    steps: StepLog,
  ): Promise<SagaInstance> {
    const index = instance.currentStep;
    const step = compiled.steps[index];
    if (step === undefined) {
      throw new SagaError(
        SagaErrorCode.InvalidDefinition,
        `Saga "${compiled.type}" has no step ${index}`,
      );
    }
    const forward = steps.find(index, StepDirection.Forward);
    const entry = steps.find(index, StepDirection.Compensate);
    const operationId = step.compensationOperationId;
    if (operationId === null || forward === undefined) {
      throw new SagaError(
        SagaErrorCode.InvalidState,
        `Step ${index} of saga ${run.sagaId} cannot be compensated`,
      );
    }
    const call = await this.deps.caller.call(run, instance, {
      step,
      direction: StepDirection.Compensate,
      operationId,
      entry,
      buildInput: (state) =>
        step.compensationInput(state, StepLog.forwardEntryOf(forward)),
    });
    if (call.result === StepCallResult.Halted) {
      return call.instance;
    }
    // As in the forward step, the clock is read after the call.
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
    const { caller, settings, events } = this.deps;
    const { dispatched, instance, outcome } = attempt;
    const index = dispatched.stepIndex;
    switch (outcome.kind) {
      case CallOutcomeKind.Success: {
        const done = caller.finish(dispatched, StepStatus.Succeeded, null);
        return caller.commit(
          run,
          instance.completeCompensation(
            compiled,
            steps.with(done),
            index - 1,
            now,
          ),
          done,
        );
      }
      case CallOutcomeKind.BusinessError:
        return caller.commit(
          run,
          instance.finish(
            SagaStatus.CompensationFailed,
            outcome.code,
            null,
            now,
          ),
          caller.finish(dispatched, StepStatus.Failed, outcome.code),
        );
      case CallOutcomeKind.TransientFailure:
      case CallOutcomeKind.Uncertain: {
        const code =
          outcome.kind === CallOutcomeKind.Uncertain
            ? SagaErrorCode.UncertainOutcome
            : SagaErrorCode.TransientFailure;
        return caller.commit(
          run,
          instance.suspend(code, outcome.reason, now, settings.suspendPolicy()),
          caller.finish(dispatched, StepStatus.Uncertain, code),
        );
      }
      case CallOutcomeKind.ProtocolViolation: {
        const code = SagaErrorCode.ProtocolViolation;
        const saved = await caller.commit(
          run,
          instance.finish(
            SagaStatus.CompensationFailed,
            code,
            outcome.reason,
            now,
          ),
          caller.finish(dispatched, StepStatus.Uncertain, code),
        );
        events.publish(SagaEventKind.ProtocolViolation, saved);
        return saved;
      }
      default: {
        const unexpected: never = outcome;
        throw new Error(`Unknown call outcome: ${JSON.stringify(unexpected)}`);
      }
    }
  }
}

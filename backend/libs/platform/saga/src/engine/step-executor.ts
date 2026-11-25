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

/** Colaboradores de `StepExecutor`. */
export interface StepExecutorDeps {
  readonly caller: StepCaller;
  readonly events: SagaEventPublisher;
  readonly settings: SagaSettings;
  readonly clock: Clock;
  readonly logger?: LoggerPort;
}

/**
 * Ejecuta un intento hacia delante del paso actual y escribe su resultado.
 * Reglas (el `CallOutcome` de `@platform/primitives`):
 * - `success`: aplica la salida con `onSuccess` y avanza (`completeStep`).
 * - `business-error`: antes del pivote compensa desde el paso anterior; después, exige intervención.
 * - `transient-failure` y `uncertain`: suspende y reintenta con la misma llave y entrada hasta agotar la suspensión, y entonces exige intervención. Antes del pivote, un plazo de saga pasado compensa incluido el paso.
 * - `transient-failure` con un motivo de avance del paso (`progressOn`): repite sin gastar suspensiones.
 * - `protocol-violation`: antes del pivote compensa incluido el paso; después, exige intervención. Emite `SagaEventKind.ProtocolViolation`.
 */
export class StepExecutor {
  constructor(private readonly deps: StepExecutorDeps) {}

  /**
   * Un intento del paso `instance.currentStep`. Si el plazo de la saga ya pasó
   * y el paso es anterior al pivote, no despacha: empieza a compensar (incluye
   * el paso si su entrada está `Dispatched` o `Uncertain`) con `DeadlineExceeded`.
   * Devuelve la instancia escrita.
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
      // Nada se despacha tras el plazo, pero un paso incierto aún debe deshacerse.
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
    // El reloj se lee después de la llamada: un paso que agotó su plazo debe
    // ver el plazo de la saga ya vencido y medir el backoff desde ese momento.
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

  /** Aplica la salida al estado y avanza. Una salida que no es JSON es una violación de protocolo. */
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
   * Un fallo que puede o no haber aplicado y se puede reintentar: suspende y
   * reintenta con la misma llave, salvo que el plazo de la saga haya pasado
   * antes del pivote, en cuyo caso el paso también se deshace.
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
   * Un paso cuyo participante rompió el protocolo: pudo aplicar su efecto y
   * reintentar no lo arregla. Antes del pivote se deshace el saga incluido el
   * paso; después, decide una persona. En ambos casos se emite una alerta.
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

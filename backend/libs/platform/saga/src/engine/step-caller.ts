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

/** Colaboradores de `StepCaller`. */
export interface StepCallerDeps {
  readonly store: SagaStore;
  readonly invoker: OperationInvoker;
  readonly leases: LeaseKeeper;
  readonly settings: SagaSettings;
  readonly clock: Clock;
  readonly tracing: Tracing;
  readonly restorer: TraceContextRestorer;
  /** Clasifica lo que lanza el invocador. */
  readonly outcomes: CallOutcomeFactory;
  readonly logger?: LoggerPort;
}

/** Un valor construido para la entrada, o la razón por la que no se pudo construir. */
type Built =
  | { readonly ok: true; readonly value: unknown }
  | { readonly ok: false; readonly error: unknown; readonly detail: string };

/** Lo que quedó escrito al despachar: la entrada de bitácora y la instancia con su versión nueva. */
interface Dispatched {
  readonly dispatched: StepLogEntry;
  readonly current: SagaInstance;
}

/**
 * Mecánica común a los pasos hacia delante y a las compensaciones: escribe la
 * intención antes de llamar (write-ahead), llama a la operación por el
 * `OperationInvoker` dentro de un `Deadline` y de un span, y hace las
 * escrituras protegidas por el token del lease y la versión.
 */
export class StepCaller {
  /** Motivo del `protocolViolation` cuando el invocador devuelve algo que no es un `CallOutcome`. */
  static readonly INVALID_INVOKER_RESULT = 'invalid-invoker-result';

  private static readonly OUTCOME_KINDS: ReadonlySet<unknown> = new Set(
    Object.values(CallOutcomeKind),
  );

  constructor(private readonly deps: StepCallerDeps) {}

  /**
   * Despacha un intento de un paso en cualquier dirección y llama a la operación.
   * - Una entrada `Dispatched` (el proceso murió tras el despacho) se invoca otra vez tal cual.
   * - Cualquier otro intento registrado se reintenta con su entrada guardada, nunca una reconstruida, con la misma llave de idempotencia.
   * - Un primer intento construye su entrada con `target.buildInput` sobre una copia del estado; si no se construye o no es JSON, escribe `RequiresIntervention` con `InputBuildFailed` y devuelve `Halted`.
   * - Antes de llamar renueva el lease más allá del `Deadline` del paso (`settings.maxStepDurationMs`); la llamada corre en un span `SagaSpan.Step` hijo de la traza guardada en la entrada o, si no hay, de la de la instancia.
   * - Si el plazo vence, la señal se aborta y el resultado es `uncertain` con el motivo `timed out after N ms`; un error lanzado se clasifica con `outcomes.fromError`; un resultado que no es un `CallOutcome` es `protocolViolation` con el motivo `invalid-invoker-result`.
   */
  call(
    run: SagaRun,
    instance: SagaInstance,
    target: StepTarget,
  ): Promise<StepCall> {
    // El span hereda la traza en la que se despachó el paso la primera vez, así
    // un reintento desde otro nodo cae en la misma traza.
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

  /** Escritura protegida de una transición, con su entrada de bitácora si la hay. Devuelve la instancia guardada. */
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

  /** La entrada con su resultado: estado, código de error, salida y `finishedAt` del reloj. */
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
   * Escribe el despacho. Un primer intento construye su entrada; cualquier
   * otro intento reutiliza la guardada, así el participante recibe la misma
   * entrada y la misma llave.
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
   * Llama a la operación dentro de su plazo. Un plazo vencido es un resultado
   * incierto: la operación pudo aplicarse aunque ya no se espere su respuesta.
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

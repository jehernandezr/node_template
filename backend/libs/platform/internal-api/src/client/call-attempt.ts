import type { ResilienceAttempt } from '@platform/resilience';
import type { TraceContextRestorer } from '@platform/observability';
import { CallOutcomeKind, type CallOutcome } from '@platform/primitives';
import type { OperationDescriptor } from '../contract/operation-descriptor.js';
import type { CallMeta } from '../transport/call-meta.js';
import type { Transport } from '../transport/transport.js';
import type { CallOptions } from './call-options.js';
import type { ClientOutcomeChecker } from './client-outcome-checker.js';
import { RetryableOutcomeError } from './retryable-outcome.error.js';

/**
 * Un intento de una llamada: arma el `CallMeta` y lo envía por el transporte.
 * Se crea una vez por llamada y lo ejecuta `ResilienceRegistry.execute`, una
 * vez por intento.
 */
export class CallAttempt {
  private sent = false;

  constructor(
    private readonly transport: Transport,
    private readonly checker: ClientOutcomeChecker,
    private readonly restorer: TraceContextRestorer,
    private readonly descriptor: OperationDescriptor,
    private readonly input: unknown,
    private readonly options: CallOptions,
  ) {}

  /** Indica si algún intento llegó a enviarse: antes de eso, parar no deja efectos inciertos. */
  get started(): boolean {
    return this.sent;
  }

  /**
   * Marca `started` y envía el intento. `CallMeta`: la llave, `tenantId` y
   * `actorId` de `options`, `traceparent` de `options` o `restorer.current()`,
   * `deadline` y `timeoutMs` del plazo del intento (`attempt.deadline.atMs` y
   * `attempt.deadline.remainingMs()`) y `signal`. El resultado pasa por
   * `checker.settle`. Si es `transient-failure` o `uncertain`, lanza
   * `RetryableOutcomeError` para que se reintente; si no, lo devuelve. Un error
   * del transporte se propaga: lo clasifica el registro de resiliencia.
   */
  async run(
    signal: AbortSignal,
    attempt: ResilienceAttempt,
  ): Promise<CallOutcome<unknown>> {
    this.sent = true;
    // El plazo del intento ya es el hijo del plazo de la llamada que calculó el registro de resiliencia.
    const traceparent = this.options.traceparent ?? this.restorer.current();
    const meta: CallMeta = {
      idempotencyKey: this.options.idempotencyKey,
      timeoutMs: attempt.deadline.remainingMs(),
      deadline: attempt.deadline.atMs,
      signal,
      ...(traceparent !== undefined && { traceparent }),
      ...(this.options.tenantId !== undefined && {
        tenantId: this.options.tenantId,
      }),
      ...(this.options.actorId !== undefined && {
        actorId: this.options.actorId,
      }),
    };
    const outcome = this.checker.settle(
      this.descriptor,
      await this.transport.invoke(this.descriptor.id, this.input, meta),
    );
    if (
      outcome.kind === CallOutcomeKind.TransientFailure ||
      outcome.kind === CallOutcomeKind.Uncertain
    ) {
      throw new RetryableOutcomeError(outcome);
    }
    return outcome;
  }
}

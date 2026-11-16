import {
  ErrorDescriptor,
  FailureKind,
  type RandomSource,
} from '@platform/kernel';
import { Backoff, type FailureClassifier } from '@platform/primitives';
import type { DispatchOptions } from './dispatch-options.js';
import type { DispatchResult } from './dispatch-result.js';
import { DispatchOutcome } from './dispatch-outcome.enum.js';
import { ErrorDisposition } from './error-disposition.enum.js';

/** Decide si un error es permanente. */
export type PermanenceCheck = (error: unknown) => boolean;

/**
 * Decide qué se hace con una entrega fallida: reintentarla con la espera de
 * la política de la cola o enviarla a la cola de errores.
 */
export class DeliveryClassifier {
  constructor(
    private readonly failures: FailureClassifier,
    private readonly random: RandomSource,
    private readonly isPermanent?: PermanenceCheck,
  ) {}

  /**
   * Disposición de una falla. Una regla propia del consumidor manda sobre el
   * clasificador. Sin ella, `Transient`, `Timeout` y `Cancelled` se reintentan
   * (una entrega repetida la protege el claim); `Permanent` y
   * `ProtocolViolation` van a la cola de errores, donde se pueden inspeccionar
   * y reenviar.
   */
  disposition(error: unknown): ErrorDisposition {
    if (this.isPermanent !== undefined) {
      return this.isPermanent(error)
        ? ErrorDisposition.DeadLetter
        : ErrorDisposition.Retry;
    }
    switch (this.failures.classify(error)) {
      case FailureKind.Transient:
      case FailureKind.Timeout:
      case FailureKind.Cancelled:
        return ErrorDisposition.Retry;
      case FailureKind.Permanent:
      case FailureKind.ProtocolViolation:
        return ErrorDisposition.DeadLetter;
    }
  }

  /**
   * Resultado `RetryLater` o `DeadLetter` de un fallo. Una falla de
   * infraestructura (`infrastructureFailure`) siempre se reintenta. Va a la
   * cola de errores cuando es permanente, cuando no hay política o cuando
   * `receiveCount` alcanzó `maxAttempts`. La espera es `Backoff.delay(receiveCount)`.
   */
  failure(
    id: string,
    error: unknown,
    options: DispatchOptions,
    infrastructureFailure: boolean,
  ): DispatchResult {
    const disposition = infrastructureFailure
      ? ErrorDisposition.Retry
      : this.disposition(error);
    const message = ErrorDescriptor.describe(error).message;
    const code = ErrorDescriptor.codeOf(error);
    const policy = options.retryPolicy;
    if (
      disposition === ErrorDisposition.DeadLetter ||
      policy === undefined ||
      options.receiveCount >= policy.maxAttempts
    ) {
      return {
        outcome: DispatchOutcome.DeadLetter,
        id,
        error: message,
        ...(code === undefined ? {} : { code }),
      };
    }
    // Una entrega repetida muchas veces no debe lanzar desde el clasificador:
    // el número de intento se acota al rango que acepta Backoff.
    const attempt = Math.min(
      Math.max(options.receiveCount, 1),
      Backoff.MAX_ATTEMPT,
    );
    return {
      outcome: DispatchOutcome.RetryLater,
      id,
      delayMs: new Backoff(policy, this.random).delay(attempt),
      error: message,
      ...(code === undefined ? {} : { code }),
    };
  }
}

import { PlatformError, type PlatformErrorOptions } from '@platform/kernel';
import { SagaErrorCode } from './saga-error-code.enum.js';

/** Códigos que indican que otra corrida se interpuso: reintentar más tarde puede funcionar. */
const CONTENTION: ReadonlySet<SagaErrorCode> = new Set([
  SagaErrorCode.ConcurrentModification,
  SagaErrorCode.LeaseNotAcquired,
  SagaErrorCode.LeaseLost,
]);

/**
 * Error base de `@platform/saga`, con un `code` estable. La contención es
 * transitoria; todo lo demás es permanente, porque repetir la misma llamada
 * contra la misma instancia da la misma respuesta.
 */
export class SagaError extends PlatformError {
  override readonly code: SagaErrorCode;

  constructor(
    code: SagaErrorCode,
    message: string,
    options: PlatformErrorOptions = {},
  ) {
    super(message, { retryable: CONTENTION.has(code), ...options });
    this.code = code;
  }
}

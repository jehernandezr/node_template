import { PlatformErrorCode } from '@contracts/platform';
import { FailureKind, PlatformError } from '@platform/kernel';

/**
 * Billing no respondió la consulta de una cuota. Responde 503 con el código de dependencia no disponible:
 * la petición puede repetirse cuando billing vuelva.
 */
export class BillingUnavailableError extends PlatformError {
  readonly code = PlatformErrorCode.ResilienceCircuitOpen;

  constructor(operationId: string, outcome: string) {
    super(`${operationId} answered ${outcome}`, {
      retryable: true,
      failureKind: FailureKind.Transient,
    });
  }
}

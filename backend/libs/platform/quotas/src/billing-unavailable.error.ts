import { PlatformErrorCode } from '@contracts/platform';
import { FailureKind, PlatformError } from '@platform/kernel';

/**
 * Billing did not answer a quota query. Responds 503 with the dependency unavailable code:
 * the request can be repeated when billing is back.
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

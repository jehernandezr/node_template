import { PlatformErrorCode } from '@contracts/platform';
import { PlatformError } from '@platform/kernel';

/** Identity did not answer a query the delivery needs. It is retryable: the message goes back to the queue. */
export class IdentityUnavailableError extends PlatformError {
  readonly code = PlatformErrorCode.InternalUnexpected;

  constructor(operationId: string, outcome: string) {
    super(`${operationId} answered ${outcome}`, { retryable: true });
  }
}

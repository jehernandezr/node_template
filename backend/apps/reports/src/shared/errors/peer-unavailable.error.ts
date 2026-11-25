import { PlatformErrorCode } from '@contracts/platform';
import { PlatformError } from '@platform/kernel';

/** Another service did not answer a query reports needs. It is retryable. */
export class PeerUnavailableError extends PlatformError {
  readonly code = PlatformErrorCode.InternalUnexpected;

  constructor(operationId: string, outcome: string) {
    super(`${operationId} answered ${outcome}`, { retryable: true });
  }
}

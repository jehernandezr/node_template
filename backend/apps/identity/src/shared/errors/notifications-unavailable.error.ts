import { PlatformErrorCode } from '@contracts/platform';
import { PlatformError } from '@platform/kernel';

/** Notifications did not accept an email from identity. It is retryable: the use case that requested it can be repeated. */
export class NotificationsUnavailableError extends PlatformError {
  readonly code = PlatformErrorCode.InternalUnexpected;

  constructor(operationId: string, outcome: string) {
    super(`${operationId} answered ${outcome}`, { retryable: true });
  }
}

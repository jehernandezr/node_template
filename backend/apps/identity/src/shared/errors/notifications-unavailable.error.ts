import { PlatformErrorCode } from '@contracts/platform';
import { PlatformError } from '@platform/kernel';

/** Notifications no aceptó un correo de identity. Es reintentable: el caso de uso que lo pidió puede repetirse. */
export class NotificationsUnavailableError extends PlatformError {
  readonly code = PlatformErrorCode.InternalUnexpected;

  constructor(operationId: string, outcome: string) {
    super(`${operationId} answered ${outcome}`, { retryable: true });
  }
}

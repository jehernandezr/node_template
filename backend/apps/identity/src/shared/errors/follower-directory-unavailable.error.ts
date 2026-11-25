import { PlatformErrorCode } from '@contracts/platform';
import { PlatformError } from '@platform/kernel';

/**
 * Un servicio no anotó en su directorio un tenant que identity ubicó. Es reintentable: la ubicación es idempotente y
 * quien la pidió puede repetirla.
 */
export class FollowerDirectoryUnavailableError extends PlatformError {
  readonly code = PlatformErrorCode.InternalUnexpected;

  constructor(operationId: string, outcome: string) {
    super(`${operationId} answered ${outcome}`, { retryable: true });
  }
}

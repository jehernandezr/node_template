import { PlatformErrorCode } from '@contracts/platform';
import { PlatformError } from '@platform/kernel';

/**
 * A service did not record in its directory a tenant that identity placed. It is retryable: placement is idempotent and
 * whoever requested it can repeat it.
 */
export class FollowerDirectoryUnavailableError extends PlatformError {
  readonly code = PlatformErrorCode.InternalUnexpected;

  constructor(operationId: string, outcome: string) {
    super(`${operationId} answered ${outcome}`, { retryable: true });
  }
}

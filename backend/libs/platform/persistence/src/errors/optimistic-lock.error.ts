import { PlatformErrorCode } from '@contracts/platform';
import { FailureKind, PlatformError } from '@platform/kernel';

/**
 * The row changed since it was read: the expected `version` is no longer the stored one.
 * Responds `PLATFORM.CONFLICT.VERSION_MISMATCH` (409). It is not retried as is:
 * the caller reads again and decides.
 */
export class OptimisticLockError extends PlatformError {
  override readonly code = PlatformErrorCode.ConflictVersionMismatch;
  readonly failureKind = FailureKind.Permanent;

  constructor(table: string, expectedVersion: number) {
    super('The row changed since it was read', {
      details: { table, expectedVersion },
    });
  }
}

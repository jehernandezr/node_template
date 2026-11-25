import { DomainError } from '@platform/kernel';
import { TenantMoveErrorCode } from './tenant-move-error-code.enum.js';

/** A move step that cannot continue. Only `RoundPending` is retried: the round continues on the next call. */
export class TenantMoveError extends DomainError {
  constructor(
    readonly code: TenantMoveErrorCode,
    message: string,
    details?: Readonly<Record<string, unknown>>,
  ) {
    super(message, details, {
      retryable: code === TenantMoveErrorCode.RoundPending,
    });
  }
}

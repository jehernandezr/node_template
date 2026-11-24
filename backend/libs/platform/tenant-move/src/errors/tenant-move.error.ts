import { DomainError } from '@platform/kernel';
import { TenantMoveErrorCode } from './tenant-move-error-code.enum.js';

/** Un paso del traslado que no puede seguir. Solo `RoundPending` se reintenta: la ronda sigue en la próxima llamada. */
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

import { FailureKind, PlatformError } from '@platform/kernel';
import { PrimitivesErrorCode } from './primitives-error-code.enum.js';

/** Se agotó el presupuesto de tiempo de la operación. */
export class DeadlineExceededError extends PlatformError {
  override readonly code = PrimitivesErrorCode.DeadlineExceeded;

  constructor(deadlineAtMs: number) {
    super('Deadline exceeded', {
      failureKind: FailureKind.Timeout,
      details: { deadlineAtMs },
    });
  }
}

import { FailureKind, PlatformError } from '@platform/kernel';
import { PrimitivesErrorCode } from './primitives-error-code.enum.js';

/** The operation's time budget ran out. */
export class DeadlineExceededError extends PlatformError {
  override readonly code = PrimitivesErrorCode.DeadlineExceeded;

  constructor(deadlineAtMs: number) {
    super('Deadline exceeded', {
      failureKind: FailureKind.Timeout,
      details: { deadlineAtMs },
    });
  }
}

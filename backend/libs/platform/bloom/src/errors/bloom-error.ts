import { FailureKind, PlatformError } from '@platform/kernel';
import type { BloomErrorCode } from './bloom-error-code.enum.js';

/**
 * Base of the `@platform/bloom` errors. Each subclass picks its failure
 * class: an invalid parameter is a programming error, and corrupted
 * data is not fixed by retrying.
 */
export class BloomError extends PlatformError {
  override readonly code: BloomErrorCode;

  constructor(code: BloomErrorCode, message: string, failureKind: FailureKind) {
    super(message, { failureKind, retryable: false });
    this.code = code;
  }
}

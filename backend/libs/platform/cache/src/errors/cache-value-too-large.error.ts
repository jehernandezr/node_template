import { FailureKind } from '@platform/kernel';
import { CacheError } from './cache-error.js';
import { CacheErrorCode } from './cache-error-code.enum.js';

/** El valor serializado supera el tamaño permitido y no se guarda. */
export class CacheValueTooLargeError extends CacheError {
  override readonly code = CacheErrorCode.ValueTooLarge;

  constructor(bytes: number, maxBytes: number) {
    super(`Cache value has ${bytes} bytes; the limit is ${maxBytes}`, {
      failureKind: FailureKind.Permanent,
      retryable: false,
      details: { bytes, maxBytes },
    });
  }
}

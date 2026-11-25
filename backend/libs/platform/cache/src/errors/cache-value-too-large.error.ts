import { FailureKind } from '@platform/kernel';
import { CacheError } from './cache-error.js';
import { CacheErrorCode } from './cache-error-code.enum.js';

/** The serialized value exceeds the allowed size and is not stored. */
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

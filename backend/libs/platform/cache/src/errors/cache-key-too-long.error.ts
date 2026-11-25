import { FailureKind } from '@platform/kernel';
import { CacheError } from './cache-error.js';
import { CacheErrorCode } from './cache-error-code.enum.js';

/** The key exceeds the allowed length. */
export class CacheKeyTooLongError extends CacheError {
  override readonly code = CacheErrorCode.KeyTooLong;

  constructor(length: number, maxLength: number) {
    super(`Cache key has ${length} characters; the limit is ${maxLength}`, {
      failureKind: FailureKind.ProtocolViolation,
      retryable: false,
      details: { length, maxLength },
    });
  }
}

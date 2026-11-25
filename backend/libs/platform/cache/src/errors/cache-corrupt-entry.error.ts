import { FailureKind } from '@platform/kernel';
import { CacheError } from './cache-error.js';
import { CacheErrorCode } from './cache-error-code.enum.js';

/** A stored entry does not have the expected shape. */
export class CacheCorruptEntryError extends CacheError {
  override readonly code = CacheErrorCode.CorruptEntry;

  constructor(reason: string) {
    super(`Cached entry is corrupt: ${reason}`, {
      failureKind: FailureKind.ProtocolViolation,
      retryable: false,
      details: { reason },
    });
  }
}

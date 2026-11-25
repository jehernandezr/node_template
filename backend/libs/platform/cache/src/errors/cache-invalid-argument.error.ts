import { FailureKind } from '@platform/kernel';
import { CacheError } from './cache-error.js';
import { CacheErrorCode } from './cache-error-code.enum.js';

/** An argument does not meet the expected range or type. It is a programming error. */
export class CacheInvalidArgumentError extends CacheError {
  override readonly code = CacheErrorCode.InvalidArgument;

  constructor(argument: string, expectation: string) {
    super(`Invalid argument "${argument}": ${expectation}`, {
      failureKind: FailureKind.ProtocolViolation,
      retryable: false,
      details: { argument, expectation },
    });
  }
}

import { FailureKind } from '@platform/kernel';
import { CacheError } from './cache-error.js';
import { CacheErrorCode } from './cache-error-code.enum.js';

/** Un argumento no cumple el rango o el tipo esperado. Es un error de programación. */
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

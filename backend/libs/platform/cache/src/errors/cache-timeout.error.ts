import { FailureKind } from '@platform/kernel';
import { CacheError } from './cache-error.js';
import { CacheErrorCode } from './cache-error-code.enum.js';

/** Una llamada al caché superó su tiempo máximo. */
export class CacheTimeoutError extends CacheError {
  override readonly code = CacheErrorCode.Timeout;

  constructor(timeoutMs: number) {
    super(`Cache operation exceeded ${timeoutMs} ms`, {
      failureKind: FailureKind.Timeout,
      retryable: true,
      details: { timeoutMs },
    });
  }
}

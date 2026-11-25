import { PlatformError, type PlatformErrorOptions } from '@platform/kernel';
import { SagaErrorCode } from './saga-error-code.enum.js';

/** Codes that indicate another run got in the way: retrying later may work. */
const CONTENTION: ReadonlySet<SagaErrorCode> = new Set([
  SagaErrorCode.ConcurrentModification,
  SagaErrorCode.LeaseNotAcquired,
  SagaErrorCode.LeaseLost,
]);

/**
 * Base error of `@platform/saga`, with a stable `code`. Contention is
 * transient; everything else is permanent, because repeating the same call
 * against the same instance gives the same response.
 */
export class SagaError extends PlatformError {
  override readonly code: SagaErrorCode;

  constructor(
    code: SagaErrorCode,
    message: string,
    options: PlatformErrorOptions = {},
  ) {
    super(message, { retryable: CONTENTION.has(code), ...options });
    this.code = code;
  }
}

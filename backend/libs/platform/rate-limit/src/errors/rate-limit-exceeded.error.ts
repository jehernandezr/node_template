import { FailureKind, PlatformError } from '@platform/kernel';
import { RateLimitErrorCode } from './rate-limit-error-code.enum.js';

/** Se superó el límite de una regla. Es transitorio: reintentar después de la espera. */
export class RateLimitExceededError extends PlatformError {
  override readonly code = RateLimitErrorCode.Exceeded;

  constructor(
    ruleName: string,
    readonly retryAfterMs: number,
  ) {
    super('Rate limit exceeded', {
      retryable: true,
      failureKind: FailureKind.Transient,
      details: { rule: ruleName, retryAfterMs },
    });
  }
}

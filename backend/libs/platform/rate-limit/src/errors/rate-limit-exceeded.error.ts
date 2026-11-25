import { FailureKind, PlatformError } from '@platform/kernel';
import { RateLimitErrorCode } from './rate-limit-error-code.enum.js';

/** The limit of a rule was exceeded. It is transient: retry after the wait. */
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

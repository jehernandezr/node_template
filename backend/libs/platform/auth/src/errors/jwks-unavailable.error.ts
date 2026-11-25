import { FailureKind, PlatformError } from '@platform/kernel';
import { AuthErrorCode } from './auth-error-code.enum.js';

/** The issuer JWKS could not be downloaded or interpreted. It is transient: the next attempt may succeed. */
export class JwksUnavailableError extends PlatformError {
  override readonly code = AuthErrorCode.JwksUnavailable;

  constructor(reason: string, cause?: unknown) {
    super(`JWKS unavailable: ${reason}`, {
      retryable: true,
      failureKind: FailureKind.Transient,
      cause,
    });
  }
}

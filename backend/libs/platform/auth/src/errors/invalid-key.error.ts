import { FailureKind, PlatformError } from '@platform/kernel';
import { AuthErrorCode } from './auth-error-code.enum.js';

/** A JWK is not a usable EC P-256 public key. It is configuration data; retrying does not fix it. */
export class InvalidKeyError extends PlatformError {
  override readonly code = AuthErrorCode.InvalidKey;

  constructor(reason: string, cause?: unknown) {
    super(`Invalid JWK: ${reason}`, {
      failureKind: FailureKind.ProtocolViolation,
      cause,
    });
  }
}

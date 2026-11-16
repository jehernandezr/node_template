import { FailureKind, PlatformError } from '@platform/kernel';
import { AuthErrorCode } from './auth-error-code.enum.js';

/** Un JWK no es una clave pública EC P-256 utilizable. Es un dato de configuración, no se arregla reintentando. */
export class InvalidKeyError extends PlatformError {
  override readonly code = AuthErrorCode.InvalidKey;

  constructor(reason: string, cause?: unknown) {
    super(`Invalid JWK: ${reason}`, {
      failureKind: FailureKind.ProtocolViolation,
      cause,
    });
  }
}

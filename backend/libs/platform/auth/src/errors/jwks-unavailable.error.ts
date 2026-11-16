import { FailureKind, PlatformError } from '@platform/kernel';
import { AuthErrorCode } from './auth-error-code.enum.js';

/** No se pudo descargar o interpretar el JWKS del emisor. Es transitorio: el siguiente intento puede responder. */
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

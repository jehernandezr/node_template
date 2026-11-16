import { PlatformErrorCode } from '@contracts/platform';
import { IdentityErrorCode } from '@contracts/identity';
import { FailureKind, PlatformError } from '@platform/kernel';
import { AuthErrorCode } from './auth-error-code.enum.js';

/** Códigos con los que se rechaza una autenticación. */
export type AuthenticationErrorCode =
  AuthErrorCode | PlatformErrorCode | IdentityErrorCode;

/**
 * Rechazo de un token o de una API key. El `code` decide la respuesta: el
 * catálogo de cada código fija el estado HTTP. Los constructores con nombre
 * son la única forma de crearlo, así cada motivo tiene un solo código.
 */
export class AuthenticationError extends PlatformError {
  override readonly code: AuthenticationErrorCode;

  private constructor(
    code: AuthenticationErrorCode,
    message: string,
    options: {
      retryable?: boolean;
      failureKind?: FailureKind;
      cause?: unknown;
    },
  ) {
    super(message, options);
    this.code = code;
  }

  /** Formato, algoritmo, firma, emisor, audiencia o llave inválidos. El motivo exacto no sale al cliente. */
  static unauthenticated(reason: string): AuthenticationError {
    return new AuthenticationError(
      PlatformErrorCode.AuthUnauthenticated,
      `Unauthenticated: ${reason}`,
      { failureKind: FailureKind.Permanent },
    );
  }

  static tokenExpired(): AuthenticationError {
    return new AuthenticationError(
      AuthErrorCode.TokenExpired,
      'Token expired',
      {
        retryable: true,
        failureKind: FailureKind.Permanent,
      },
    );
  }

  static sessionExpired(): AuthenticationError {
    return AuthenticationError.permanent(
      IdentityErrorCode.SessionExpired,
      'Session expired',
    );
  }

  static sessionRevoked(): AuthenticationError {
    return AuthenticationError.permanent(
      IdentityErrorCode.SessionRevoked,
      'Session revoked',
    );
  }

  static tokenRevoked(): AuthenticationError {
    return AuthenticationError.permanent(
      IdentityErrorCode.TokenRevoked,
      'Token revoked',
    );
  }

  static userSuspended(): AuthenticationError {
    return AuthenticationError.permanent(
      IdentityErrorCode.UserSuspended,
      'User suspended',
    );
  }

  static tenantSuspended(): AuthenticationError {
    return AuthenticationError.permanent(
      IdentityErrorCode.TenantSuspended,
      'Tenant suspended',
    );
  }

  static stalePermissions(): AuthenticationError {
    return AuthenticationError.permanent(
      IdentityErrorCode.TokenStalePermissions,
      'Token permissions are stale',
    );
  }

  /** No se puede revisar la revocación ni obtener la clave del emisor: se rechaza en lugar de aceptar un token sin revisar. */
  static stateUnavailable(cause: unknown): AuthenticationError {
    return new AuthenticationError(
      PlatformErrorCode.ResilienceCircuitOpen,
      'Authentication state is unavailable',
      { retryable: true, failureKind: FailureKind.Transient, cause },
    );
  }

  private static permanent(
    code: IdentityErrorCode,
    message: string,
  ): AuthenticationError {
    return new AuthenticationError(code, message, {
      failureKind: FailureKind.Permanent,
    });
  }
}

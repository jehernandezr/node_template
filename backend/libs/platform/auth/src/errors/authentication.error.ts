import { PlatformErrorCode } from '@contracts/platform';
import { IdentityErrorCode } from '@contracts/identity';
import { FailureKind, PlatformError } from '@platform/kernel';
import { AuthErrorCode } from './auth-error-code.enum.js';

/** Codes with which an authentication is rejected. */
export type AuthenticationErrorCode =
  AuthErrorCode | PlatformErrorCode | IdentityErrorCode;

/**
 * Rejection of a token or an API key. The `code` decides the response: the
 * catalog of each code sets the HTTP status. The named constructors
 * are the only way to create it, so each reason has a single code.
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

  /** Invalid format, algorithm, signature, issuer, audience or key. The exact reason does not reach the client. */
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

  /** Revocation cannot be checked or the issuer key cannot be obtained: it rejects instead of accepting an unchecked token. */
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

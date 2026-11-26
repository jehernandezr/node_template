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

  /**
   * Invalid format, algorithm, signature, issuer, audience or key. The exact reason does not reach the client.
   * @param reason Reason kept in the logs.
   * @returns The error.
   */
  static unauthenticated(reason: string): AuthenticationError {
    return new AuthenticationError(
      PlatformErrorCode.AuthUnauthenticated,
      `Unauthenticated: ${reason}`,
      { failureKind: FailureKind.Permanent },
    );
  }

  /**
   * The access token expired; the client refreshes it.
   * @returns The error.
   */
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

  /**
   * The session expired; the client signs in again.
   * @returns The error.
   */
  static sessionExpired(): AuthenticationError {
    return AuthenticationError.permanent(
      IdentityErrorCode.SessionExpired,
      'Session expired',
    );
  }

  /**
   * The session was revoked.
   * @returns The error.
   */
  static sessionRevoked(): AuthenticationError {
    return AuthenticationError.permanent(
      IdentityErrorCode.SessionRevoked,
      'Session revoked',
    );
  }

  /**
   * The token was revoked by a user or tenant epoch.
   * @returns The error.
   */
  static tokenRevoked(): AuthenticationError {
    return AuthenticationError.permanent(
      IdentityErrorCode.TokenRevoked,
      'Token revoked',
    );
  }

  /**
   * The user is suspended.
   * @returns The error.
   */
  static userSuspended(): AuthenticationError {
    return AuthenticationError.permanent(
      IdentityErrorCode.UserSuspended,
      'User suspended',
    );
  }

  /**
   * The tenant is suspended.
   * @returns The error.
   */
  static tenantSuspended(): AuthenticationError {
    return AuthenticationError.permanent(
      IdentityErrorCode.TenantSuspended,
      'Tenant suspended',
    );
  }

  /**
   * The token carries an old permissions version; the client refreshes it.
   * @returns The error.
   */
  static stalePermissions(): AuthenticationError {
    return AuthenticationError.permanent(
      IdentityErrorCode.TokenStalePermissions,
      'Token permissions are stale',
    );
  }

  /**
   * Revocation cannot be checked or the issuer key cannot be obtained: it rejects instead of accepting an unchecked token.
   * @param cause Failure of the state store.
   * @returns The error.
   */
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

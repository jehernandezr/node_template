import { PlatformErrorCode } from '@contracts/platform';
import { IdentityErrorCode } from '@contracts/identity';
import { FailureKind, PlatformError } from '@platform/kernel';
import { AuthenticationError } from '../authentication.error.js';
import { AuthErrorCode } from '../auth-error-code.enum.js';

describe('AuthenticationError', () => {
  describe('constructors', () => {
    it.each<[string, () => AuthenticationError, string]>([
      [
        'unauthenticated',
        () => AuthenticationError.unauthenticated('x'),
        PlatformErrorCode.AuthUnauthenticated,
      ],
      [
        'tokenExpired',
        () => AuthenticationError.tokenExpired(),
        AuthErrorCode.TokenExpired,
      ],
      [
        'sessionExpired',
        () => AuthenticationError.sessionExpired(),
        IdentityErrorCode.SessionExpired,
      ],
      [
        'sessionRevoked',
        () => AuthenticationError.sessionRevoked(),
        IdentityErrorCode.SessionRevoked,
      ],
      [
        'tokenRevoked',
        () => AuthenticationError.tokenRevoked(),
        IdentityErrorCode.TokenRevoked,
      ],
      [
        'userSuspended',
        () => AuthenticationError.userSuspended(),
        IdentityErrorCode.UserSuspended,
      ],
      [
        'tenantSuspended',
        () => AuthenticationError.tenantSuspended(),
        IdentityErrorCode.TenantSuspended,
      ],
      [
        'stalePermissions',
        () => AuthenticationError.stalePermissions(),
        IdentityErrorCode.TokenStalePermissions,
      ],
      [
        'stateUnavailable',
        () => AuthenticationError.stateUnavailable(new Error('down')),
        PlatformErrorCode.DependencyUnavailable,
      ],
    ])('%s carries its public code', (_name, build, code) => {
      expect(build().code).toBe(code);
    });

    it('is an instance of PlatformError', () => {
      expect(AuthenticationError.unauthenticated('x')).toBeInstanceOf(
        PlatformError,
      );
    });

    it('prefixes the message of an unauthenticated rejection', () => {
      expect(AuthenticationError.unauthenticated('x').message).toBe(
        'Unauthenticated: x',
      );
    });
  });

  describe('retry and failure classification', () => {
    it('keeps the cause and marks state unavailability as transient and retryable', () => {
      const cause = new Error('valkey down');

      const error = AuthenticationError.stateUnavailable(cause);

      expect(error.cause).toBe(cause);
      expect(error.retryable).toBe(true);
      expect(error).toMatchObject({ failureKind: FailureKind.Transient });
    });

    it('marks an expired token as retryable so the client refreshes', () => {
      expect(AuthenticationError.tokenExpired().retryable).toBe(true);
    });

    it('marks a rejected session as not retryable', () => {
      expect(AuthenticationError.sessionRevoked().retryable).toBe(false);
    });
  });
});

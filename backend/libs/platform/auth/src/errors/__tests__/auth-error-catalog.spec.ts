import { ErrorAudience } from '@contracts/platform';
import { ErrorCode, FailureKind } from '@platform/kernel';
import { authErrorCatalog } from '../auth-error-catalog.js';
import { AuthErrorCode } from '../auth-error-code.enum.js';
import { InvalidKeyError } from '../invalid-key.error.js';
import { JwksUnavailableError } from '../jwks-unavailable.error.js';

describe('authErrorCatalog', () => {
  it('has one entry for every AuthErrorCode', () => {
    const codes = authErrorCatalog.map((entry) => entry.code);

    expect(codes.sort()).toEqual(Object.values(AuthErrorCode).sort());
  });

  it('exposes TokenExpired as public with status 401 and retryable', () => {
    const entry = authErrorCatalog.find(
      (candidate) => candidate.code === AuthErrorCode.TokenExpired,
    );

    expect(entry).toMatchObject({
      audience: ErrorAudience.Public,
      httpStatus: 401,
      retryable: true,
    });
  });

  it.each(Object.values(AuthErrorCode))(
    'uses a valid code format for %s',
    (code) => {
      expect(ErrorCode.isValid(code)).toBe(true);
    },
  );
});

describe('InvalidKeyError', () => {
  it('has its code, a protocol violation kind and is not retryable', () => {
    const error = new InvalidKeyError('not an EC P-256 key');

    expect(error.code).toBe(AuthErrorCode.InvalidKey);
    expect(error).toMatchObject({ failureKind: FailureKind.ProtocolViolation });
    expect(error.retryable).toBe(false);
  });
});

describe('JwksUnavailableError', () => {
  it('has its code, a transient kind and is retryable', () => {
    const error = new JwksUnavailableError('request failed');

    expect(error.code).toBe(AuthErrorCode.JwksUnavailable);
    expect(error).toMatchObject({ failureKind: FailureKind.Transient });
    expect(error.retryable).toBe(true);
  });
});

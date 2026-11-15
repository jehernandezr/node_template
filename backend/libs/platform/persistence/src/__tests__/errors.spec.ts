import { PlatformErrorCode, platformErrorCatalog } from '@contracts/platform';
import { isErrorCode } from '@platform/kernel';
import { classifyFailure, FailureKind } from '@platform/primitives';
import {
  OptimisticLockError,
  PersistenceError,
  toPersistenceError,
} from '../errors.js';

const persistenceCodes = Object.values(PlatformErrorCode).filter((code) =>
  code.startsWith('PLATFORM.PERSISTENCE.'),
);

describe('errors', () => {
  it('uses well formed codes', () => {
    for (const code of persistenceCodes) {
      expect(isErrorCode(code)).toBe(true);
    }
  });

  it('reports a version mismatch with the catalogued 409 code', () => {
    const error = new OptimisticLockError('tasks', 3);
    expect(error.code).toBe(PlatformErrorCode.ConflictVersionMismatch);
    expect(
      platformErrorCatalog.find((entry) => entry.code === error.code)
        ?.httpStatus,
    ).toBe(409);
    expect(classifyFailure(error)).toBe(FailureKind.Permanent);
  });

  it.each([
    ['40001', FailureKind.Transient],
    ['40P01', FailureKind.Transient],
    ['08006', FailureKind.Transient],
    ['23505', FailureKind.Permanent],
  ])('classifies SQLSTATE %s', (code, kind) => {
    const error = toPersistenceError(
      Object.assign(new Error('driver text with a value'), { code }),
    );
    expect(error).toMatchObject({
      code: PlatformErrorCode.PersistenceQueryFailed,
      failureKind: kind,
      retryable: kind === FailureKind.Transient,
      details: { sqlState: code },
    });
    expect(error.message).not.toContain('value');
    expect(classifyFailure(error)).toBe(kind);
  });

  it.each(['ECONNRESET', 'EPIPE'])(
    'treats the Node network error %s as transient',
    (code) => {
      const error = toPersistenceError(
        Object.assign(new Error('socket'), { code }),
      );
      expect(classifyFailure(error)).toBe(FailureKind.Transient);
    },
  );

  it('passes platform errors through', () => {
    const original = new OptimisticLockError('tasks', 1);
    expect(toPersistenceError(original)).toBe(original);
  });

  it('fixes the failure kind by code', () => {
    expect(
      new PersistenceError(PlatformErrorCode.PersistenceContention, 'x')
        .retryable,
    ).toBe(true);
    expect(
      new PersistenceError(PlatformErrorCode.PersistenceTenantRequired, 'x')
        .failureKind,
    ).toBe(FailureKind.ProtocolViolation);
  });
});

import { PlatformErrorCode, platformErrorCatalog } from '@contracts/platform';
import { FailureKind } from '@platform/kernel';
import { FailureClassifier } from '@platform/primitives';
import { OptimisticLockError } from '../optimistic-lock.error.js';

describe('OptimisticLockError', () => {
  it('reports a version mismatch with the catalogued 409 code', () => {
    const error = new OptimisticLockError('tasks', 3);
    expect(error.code).toBe(PlatformErrorCode.ConflictVersionMismatch);
    expect(
      platformErrorCatalog.find((entry) => entry.code === error.code)
        ?.httpStatus,
    ).toBe(409);
  });

  it('is a permanent failure that keeps the table and the expected version', () => {
    const error = new OptimisticLockError('tasks', 3);
    expect(new FailureClassifier().classify(error)).toBe(FailureKind.Permanent);
    expect(error.details).toEqual({ table: 'tasks', expectedVersion: 3 });
  });
});

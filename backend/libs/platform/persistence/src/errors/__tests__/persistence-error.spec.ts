import { FailureKind } from '@platform/kernel';
import { PersistenceError } from '../persistence-error.js';
import { PersistenceErrorCode } from '../persistence-error-code.enum.js';

describe('PersistenceError', () => {
  it('fixes the failure kind by code', () => {
    expect(
      new PersistenceError(PersistenceErrorCode.Contention, 'x').retryable,
    ).toBe(true);
    expect(
      new PersistenceError(PersistenceErrorCode.TenantRequired, 'x')
        .failureKind,
    ).toBe(FailureKind.ProtocolViolation);
    expect(
      new PersistenceError(PersistenceErrorCode.CorruptRow, 'x').failureKind,
    ).toBe(FailureKind.Permanent);
  });

  it('takes the failure kind of a QueryFailed from its cause', () => {
    const transient = new PersistenceError(
      PersistenceErrorCode.QueryFailed,
      'x',
      { cause: Object.assign(new Error('x'), { code: '40P01' }) },
    );
    expect(transient).toMatchObject({
      failureKind: FailureKind.Transient,
      retryable: true,
    });
  });

  it('honours an explicit failure kind on a QueryFailed', () => {
    const error = new PersistenceError(PersistenceErrorCode.QueryFailed, 'x', {
      cause: Object.assign(new Error('x'), { code: '40P01' }),
      failureKind: FailureKind.Permanent,
    });
    expect(error).toMatchObject({
      failureKind: FailureKind.Permanent,
      retryable: false,
    });
  });

  it('builds an invalid configuration error naming the option', () => {
    const error = PersistenceError.invalidConfiguration(
      'concurrency',
      'an integer >= 1',
    );
    expect(error).toMatchObject({
      code: PersistenceErrorCode.InvalidConfig,
      message: 'concurrency must be an integer >= 1',
      details: { option: 'concurrency' },
      failureKind: FailureKind.ProtocolViolation,
    });
  });
});

import { FailureKind } from '@platform/kernel';
import { FailureClassifier } from '@platform/primitives';
import { OptimisticLockError } from '../optimistic-lock.error.js';
import { PersistenceErrorCode } from '../persistence-error-code.enum.js';
import { PersistenceErrorTranslator } from '../persistence-error-translator.js';

const classifier = new FailureClassifier();

describe('PersistenceErrorTranslator', () => {
  it.each([
    ['40001', FailureKind.Transient],
    ['23505', FailureKind.Permanent],
  ])('wraps SQLSTATE %s as QueryFailed', (sqlState, kind) => {
    const error = PersistenceErrorTranslator.toPersistenceError(
      Object.assign(new Error('driver text with a value'), { code: sqlState }),
    );
    expect(error).toMatchObject({
      code: PersistenceErrorCode.QueryFailed,
      failureKind: kind,
      retryable: kind === FailureKind.Transient,
      details: { sqlState },
    });
    expect(error.message).not.toContain('value');
    expect(classifier.classify(error)).toBe(kind);
  });

  it('omits details when the driver error has no SQLSTATE', () => {
    const error = PersistenceErrorTranslator.toPersistenceError(
      new Error('socket'),
    );
    expect(error.details).toBeUndefined();
  });

  it('passes platform errors through', () => {
    const original = new OptimisticLockError('tasks', 1);
    expect(PersistenceErrorTranslator.toPersistenceError(original)).toBe(
      original,
    );
  });
});

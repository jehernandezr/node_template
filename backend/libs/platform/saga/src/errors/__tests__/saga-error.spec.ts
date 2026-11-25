import { FailureKind, PlatformError } from '@platform/kernel';
import { FailureClassifier } from '@platform/primitives';
import { SagaError } from '../saga-error.js';
import { SagaErrorCode } from '../saga-error-code.enum.js';

describe('SagaError', () => {
  it('extends PlatformError and keeps its code', () => {
    const error = new SagaError(SagaErrorCode.NotFound, 'missing');

    expect(error).toBeInstanceOf(PlatformError);
    expect(error).toBeInstanceOf(SagaError);
    expect(error.code).toBe(SagaErrorCode.NotFound);
    expect(error.message).toBe('missing');
  });

  it('is retryable only on contention: ConcurrentModification, LeaseNotAcquired and LeaseLost', () => {
    const retryable = [
      SagaErrorCode.ConcurrentModification,
      SagaErrorCode.LeaseNotAcquired,
      SagaErrorCode.LeaseLost,
    ];
    for (const code of Object.values(SagaErrorCode)) {
      const error = new SagaError(code, 'x');
      expect({ code, retryable: error.retryable }).toEqual({
        code,
        retryable: retryable.includes(code),
      });
    }
  });

  it('classifies contention as transient and the rest as permanent', () => {
    const lost = new SagaError(SagaErrorCode.LeaseLost, 'lost');
    const invalid = new SagaError(SagaErrorCode.InvalidState, 'bad');

    expect(new FailureClassifier().classify(lost)).toBe(FailureKind.Transient);
    expect(new FailureClassifier().classify(invalid)).toBe(
      FailureKind.Permanent,
    );
  });

  it('accepts details without changing the code or the retryability', () => {
    const error = new SagaError(SagaErrorCode.InvalidState, 'bad', {
      details: { sagaId: 'a' },
    });

    expect(error.details).toEqual({ sagaId: 'a' });
    expect(error.retryable).toBe(false);
    expect(SagaErrorCode.InvalidState).toBe(error.code);
  });
});

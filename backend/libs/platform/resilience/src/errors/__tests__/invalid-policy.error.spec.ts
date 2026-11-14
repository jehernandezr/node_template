import { FailureKind } from '@platform/kernel';
import { FailureClassifier } from '@platform/primitives';
import { InvalidPolicyError } from '../invalid-policy.error.js';
import { ResilienceErrorCode } from '../resilience-error-code.enum.js';

describe('InvalidPolicyError', () => {
  it('is a non-retryable protocol violation with the given message', () => {
    const error = new InvalidPolicyError('timeoutMs must be positive');
    expect(error.message).toBe('timeoutMs must be positive');
    expect(error).toMatchObject({
      code: ResilienceErrorCode.InvalidPolicy,
      retryable: false,
    });
    expect(error.details).toBeUndefined();
    expect(new FailureClassifier().classify(error)).toBe(
      FailureKind.ProtocolViolation,
    );
  });
});

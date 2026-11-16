import { FailureClassifier } from '@platform/primitives';
import { FailureKind } from '@platform/kernel';
import { ResilienceErrorCode } from '../resilience-error-code.enum.js';
import { UnknownPolicyError } from '../unknown-policy.error.js';

describe('UnknownPolicyError', () => {
  it('is a non-retryable protocol violation that names the policy', () => {
    const error = new UnknownPolicyError('missing');
    expect(error).toMatchObject({
      code: ResilienceErrorCode.UnknownPolicy,
      retryable: false,
      details: { policy: 'missing' },
    });
    expect(new FailureClassifier().classify(error)).toBe(
      FailureKind.ProtocolViolation,
    );
  });
});

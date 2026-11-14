import { FailureClassifier } from '@platform/primitives';
import { ResilienceErrorCode } from '../resilience-error-code.enum.js';
import { ResilienceTimeoutError } from '../resilience-timeout.error.js';
import { TimeoutScope } from '../timeout-scope.enum.js';
import { FailureKind } from '@platform/kernel';

describe('ResilienceTimeoutError', () => {
  it('keeps the scope and the budget and classifies the failure as a timeout', () => {
    const error = new ResilienceTimeoutError(
      'cache',
      TimeoutScope.Attempt,
      100,
    );
    expect(error).toMatchObject({
      code: ResilienceErrorCode.Timeout,
      scope: TimeoutScope.Attempt,
      timeoutMs: 100,
      details: { policy: 'cache', scope: TimeoutScope.Attempt, timeoutMs: 100 },
    });
    expect(new FailureClassifier().classify(error)).toBe(FailureKind.Timeout);
  });
});

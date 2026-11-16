import { FailureClassifier } from '@platform/primitives';
import { CircuitOpenError } from '../circuit-open.error.js';
import { ResilienceErrorCode } from '../resilience-error-code.enum.js';

describe('CircuitOpenError', () => {
  it('reports a transient, retryable open circuit with its details', () => {
    const error = new CircuitOpenError('cache', 'valkey', {
      retryAfterMs: 10_000,
    });
    expect(error).toMatchObject({
      code: ResilienceErrorCode.CircuitOpen,
      retryable: true,
      retryAfterMs: 10_000,
      details: { policy: 'cache', dependencyKey: 'valkey' },
    });
    expect(new FailureClassifier().isTransient(error)).toBe(true);
  });
});

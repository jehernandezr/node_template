import { FailureKind } from '@platform/kernel';
import { FailureClassifier } from '@platform/primitives';
import { ResilienceError } from '../resilience-error.js';
import { ResilienceErrorCode } from '../resilience-error-code.enum.js';

describe('ResilienceError', () => {
  it.each([
    [ResilienceErrorCode.CircuitOpen, FailureKind.Transient, true],
    [ResilienceErrorCode.BulkheadFull, FailureKind.Transient, true],
    [ResilienceErrorCode.Timeout, FailureKind.Timeout, false],
    [ResilienceErrorCode.UnknownPolicy, FailureKind.ProtocolViolation, false],
    [ResilienceErrorCode.InvalidPolicy, FailureKind.ProtocolViolation, false],
  ])('classifies %s as %s (retryable %p)', (code, kind, retryable) => {
    const error = new ResilienceError(code, 'message');
    expect(error.code).toBe(code);
    expect(new FailureClassifier().classify(error)).toBe(kind);
    expect(error.retryable).toBe(retryable);
  });

  it('carries the cause, the retry hint and the details', () => {
    const cause = new Error('root');
    const error = new ResilienceError(ResilienceErrorCode.CircuitOpen, 'open', {
      cause,
      retryAfterMs: 500,
      details: { policy: 'x' },
    });
    expect(error.cause).toBe(cause);
    expect(error.retryAfterMs).toBe(500);
    expect(error.details).toEqual({ policy: 'x' });
  });
});

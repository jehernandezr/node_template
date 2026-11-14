import { PlatformErrorCode } from '@contracts/platform';
import { PlatformError } from '@platform/kernel';
import { classifyFailure, FailureKind } from '@platform/primitives';
import {
  BulkheadFullError,
  CircuitOpenError,
  ResilienceError,
  ResilienceTimeoutError,
  TimeoutScope,
  UnknownPolicyError,
} from '../errors.js';

describe('ResilienceError', () => {
  it('carries code, cause and retry hint', () => {
    const cause = new Error('root');
    const error = new ResilienceError(
      PlatformErrorCode.ResilienceCircuitOpen,
      'open',
      { cause, retryAfterMs: 250 },
    );

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(PlatformError);
    expect(error.name).toBe('ResilienceError');
    expect(error.code).toBe(PlatformErrorCode.ResilienceCircuitOpen);
    expect(error.cause).toBe(cause);
    expect(error.retryAfterMs).toBe(250);
  });

  it.each([
    [new CircuitOpenError('p', 'd'), FailureKind.Transient, true],
    [new BulkheadFullError('p', 'd'), FailureKind.Transient, true],
    [
      new ResilienceTimeoutError('p', TimeoutScope.Attempt, 10),
      FailureKind.Timeout,
      false,
    ],
    [new UnknownPolicyError('p'), FailureKind.ProtocolViolation, false],
  ])('classifies %p as %s (retryable %s)', (error, kind, retryable) => {
    expect(error).toBeInstanceOf(ResilienceError);
    expect(classifyFailure(error)).toBe(kind);
    expect(error.retryable).toBe(retryable);
  });

  it('keeps diagnostic details without input values', () => {
    const error = new ResilienceTimeoutError('cache', TimeoutScope.Total, 30);
    expect(error.details).toEqual({
      policy: 'cache',
      scope: TimeoutScope.Total,
      timeoutMs: 30,
    });
    expect(error.scope).toBe(TimeoutScope.Total);
    expect(error.timeoutMs).toBe(30);
  });
});

import { FailureKind, PlatformError } from '@platform/kernel';
import { InvalidTraceContextError } from '../invalid-trace-context.error.js';
import { ObservabilityErrorCode } from '../observability-error-code.enum.js';

describe('InvalidTraceContextError', () => {
  it('carries the invalid trace context code and protocol failure kind', () => {
    const error = new InvalidTraceContextError(
      'traceId must be 32 hex characters',
    );

    expect(error).toBeInstanceOf(PlatformError);
    expect(error).toMatchObject({
      code: ObservabilityErrorCode.InvalidTraceContext,
      failureKind: FailureKind.ProtocolViolation,
      retryable: false,
    });
  });

  it('keeps the expectation in the details and in the message', () => {
    const error = new InvalidTraceContextError(
      'traceId must be 32 hex characters',
    );

    expect(error.details).toEqual({
      expectation: 'traceId must be 32 hex characters',
    });
    expect(error.message).toContain('traceId must be 32 hex characters');
  });
});

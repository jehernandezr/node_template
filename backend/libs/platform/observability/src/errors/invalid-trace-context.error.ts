import { FailureKind, PlatformError } from '@platform/kernel';
import { ObservabilityErrorCode } from './observability-error-code.enum.js';

/** A trace id or a `traceparent` does not meet the W3C format. The message does not repeat the received value. */
export class InvalidTraceContextError extends PlatformError {
  override readonly code = ObservabilityErrorCode.InvalidTraceContext;

  constructor(expectation: string) {
    super(`Invalid trace context: ${expectation}`, {
      failureKind: FailureKind.ProtocolViolation,
      details: { expectation },
    });
  }
}

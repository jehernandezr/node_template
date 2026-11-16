import { FailureKind, PlatformError } from '@platform/kernel';
import { ObservabilityErrorCode } from './observability-error-code.enum.js';

/** Un id de traza o un `traceparent` no cumple el formato W3C. El mensaje no repite el valor recibido. */
export class InvalidTraceContextError extends PlatformError {
  override readonly code = ObservabilityErrorCode.InvalidTraceContext;

  constructor(expectation: string) {
    super(`Invalid trace context: ${expectation}`, {
      failureKind: FailureKind.ProtocolViolation,
      details: { expectation },
    });
  }
}

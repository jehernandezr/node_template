import { FailureKind, PlatformError } from '@platform/kernel';
import { ObservabilityErrorCode } from './observability-error-code.enum.js';

/** A dependency with the same name was registered twice in the `HealthRegistry`. */
export class DuplicateHealthCheckError extends PlatformError {
  override readonly code = ObservabilityErrorCode.DuplicateHealthCheck;

  constructor(name: string) {
    super(`A health check named "${name}" is already registered`, {
      failureKind: FailureKind.ProtocolViolation,
      details: { name },
    });
  }
}

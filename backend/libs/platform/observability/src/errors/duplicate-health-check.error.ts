import { FailureKind, PlatformError } from '@platform/kernel';
import { ObservabilityErrorCode } from './observability-error-code.enum.js';

/** Se registró dos veces una dependencia con el mismo nombre en el `HealthRegistry`. */
export class DuplicateHealthCheckError extends PlatformError {
  override readonly code = ObservabilityErrorCode.DuplicateHealthCheck;

  constructor(name: string) {
    super(`A health check named "${name}" is already registered`, {
      failureKind: FailureKind.ProtocolViolation,
      details: { name },
    });
  }
}

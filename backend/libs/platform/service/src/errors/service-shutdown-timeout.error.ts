import { PlatformError } from '@platform/kernel';
import { ServiceErrorCode } from './service-error-code.enum.js';

/** The service shutdown exceeded the grace period. */
export class ServiceShutdownTimeoutError extends PlatformError {
  override readonly code = ServiceErrorCode.ShutdownTimeout;

  constructor(serviceName: string, graceMs: number) {
    super(`${serviceName} did not shut down in ${graceMs} ms`, {
      details: { serviceName, graceMs },
    });
  }
}

import { PlatformError } from '@platform/kernel';
import { ServiceErrorCode } from './service-error-code.enum.js';

/** El cierre del servicio superó el plazo de gracia. */
export class ServiceShutdownTimeoutError extends PlatformError {
  override readonly code = ServiceErrorCode.ShutdownTimeout;

  constructor(serviceName: string, graceMs: number) {
    super(`${serviceName} no cerró en ${graceMs} ms`, {
      details: { serviceName, graceMs },
    });
  }
}

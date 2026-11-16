import { PlatformError } from '@platform/kernel';
import { ServiceErrorCode } from './service-error-code.enum.js';

/** La `ServiceDefinition` tiene un campo vacío o contradice a su contrato. */
export class InvalidServiceDefinitionError extends PlatformError {
  override readonly code = ServiceErrorCode.InvalidDefinition;

  constructor(serviceName: string, reason: string) {
    super(`Definición de servicio inválida (${serviceName}): ${reason}`, {
      details: { serviceName, reason },
    });
  }
}

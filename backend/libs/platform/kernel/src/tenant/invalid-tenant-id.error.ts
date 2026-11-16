import { DomainError } from '../errors/domain-error.js';
import { KernelErrorCode } from '../errors/kernel-error-code.enum.js';

/** El identificador de tenant no cumple la longitud o el formato. No incluye el valor recibido. */
export class InvalidTenantIdError extends DomainError {
  override readonly code = KernelErrorCode.InvalidTenantId;

  constructor(reason: string) {
    super(`Invalid tenant id: ${reason}`);
  }
}

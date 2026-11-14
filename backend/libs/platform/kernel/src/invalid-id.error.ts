import { PlatformErrorCode } from '@contracts/platform';
import { DomainError } from './domain-error.js';

/**
 * Se lanza cuando un valor no es un UUIDv7 válido. Ni el mensaje ni los
 * detalles incluyen el valor recibido, que puede venir de una entrada externa.
 */
export class InvalidIdError extends DomainError {
  override readonly code = PlatformErrorCode.KernelInvalidId;

  constructor(value: unknown) {
    super('Invalid UUIDv7', { receivedType: typeof value });
  }
}

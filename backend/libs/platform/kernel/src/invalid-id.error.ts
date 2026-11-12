import { DomainError } from './domain-error.js';

/** Códigos de error del kernel. */
export enum KernelErrorCode {
  InvalidId = 'PLATFORM.KERNEL.INVALID_ID',
}

/** Se lanza cuando un valor no es un UUIDv7 válido. */
export class InvalidIdError extends DomainError {
  override readonly code = KernelErrorCode.InvalidId;

  constructor(value: unknown) {
    super(`Invalid UUIDv7: ${String(value)}`, { value });
  }
}

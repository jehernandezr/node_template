import { DomainError } from './domain-error.js';
import { KernelErrorCode } from './kernel-error-code.enum.js';

/**
 * Thrown when a value is not a valid UUIDv7. Neither the message nor the
 * details include the received value, which may come from external input.
 */
export class InvalidIdError extends DomainError {
  override readonly code = KernelErrorCode.InvalidId;

  constructor(value: unknown) {
    super('Invalid UUIDv7', { receivedType: typeof value });
  }
}

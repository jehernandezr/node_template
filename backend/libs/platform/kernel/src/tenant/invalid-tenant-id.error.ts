import { DomainError } from '../errors/domain-error.js';
import { KernelErrorCode } from '../errors/kernel-error-code.enum.js';

/** The tenant identifier does not meet the length or format. Does not include the received value. */
export class InvalidTenantIdError extends DomainError {
  override readonly code = KernelErrorCode.InvalidTenantId;

  constructor(reason: string) {
    super(`Invalid tenant id: ${reason}`);
  }
}

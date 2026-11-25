import { DomainError } from '../errors/domain-error.js';
import { KernelErrorCode } from '../errors/kernel-error-code.enum.js';

/** Amount out of range, invalid currency or a mix of different currencies. */
export class InvalidMoneyError extends DomainError {
  override readonly code = KernelErrorCode.InvalidMoney;

  constructor(reason: string) {
    super(`Invalid money: ${reason}`);
  }
}

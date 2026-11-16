import { DomainError } from '../errors/domain-error.js';
import { KernelErrorCode } from '../errors/kernel-error-code.enum.js';

/** Monto fuera de rango, moneda inválida o combinación de monedas distintas. */
export class InvalidMoneyError extends DomainError {
  override readonly code = KernelErrorCode.InvalidMoney;

  constructor(reason: string) {
    super(`Invalid money: ${reason}`);
  }
}

import { BillingErrorCode } from '@contracts/billing';
import { DomainError } from '@platform/kernel';

/** Regla de billing que no se cumple. El estado HTTP y la audiencia salen del catálogo del contrato. */
export class BillingError extends DomainError {
  constructor(
    readonly code: BillingErrorCode,
    details?: Readonly<Record<string, unknown>>,
  ) {
    super(code, details);
  }
}

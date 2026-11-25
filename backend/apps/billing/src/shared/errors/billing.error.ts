import { BillingErrorCode } from '@contracts/billing';
import { DomainError } from '@platform/kernel';

/** Billing rule that is not met. The HTTP status and the audience come from the contract catalog. */
export class BillingError extends DomainError {
  constructor(
    readonly code: BillingErrorCode,
    details?: Readonly<Record<string, unknown>>,
  ) {
    super(code, details);
  }
}

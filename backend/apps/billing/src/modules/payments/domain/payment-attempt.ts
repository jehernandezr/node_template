import { PaymentStatus } from './payment-status.enum.js';

/** An invoice charge attempt, recorded before requesting it from the provider. */
export interface PaymentAttempt {
  readonly id: string;
  readonly invoiceId: string;
  /** Attempt number within the invoice: there is at most one attempt per number. */
  readonly attempt: number;
  readonly status: PaymentStatus;
  readonly requestedAt: Date;
  /** Provider reference, for an approved charge. */
  readonly reference?: string;
  /** Rejection reason, for a rejected charge. */
  readonly reason?: string;
}

/** States of an attempt that is still waiting for the final provider response. */
export const OPEN_PAYMENT_STATUSES: ReadonlySet<PaymentStatus> = new Set([
  PaymentStatus.Requested,
  PaymentStatus.Pending,
]);

import type { Currency } from '@contracts/billing';
import type { PaymentStatus } from './payment-status.enum.js';

/** What it is asked to charge: attempt `attempt` of an issued invoice. */
export interface ChargeRequest {
  readonly tenantId: string;
  readonly invoiceId: string;
  readonly invoiceNumber: string;
  /** Number of the invoice charge attempt: the first is 1 and each rejection opens the next one. */
  readonly attempt: number;
  readonly amountMinor: number;
  readonly currency: Currency;
}

/** The charge as it reaches the provider, with the recorded attempt id as the idempotency key. */
export interface ProviderCharge extends ChargeRequest {
  readonly attemptId: string;
}

/** Provider response to a charge attempt. */
export interface PaymentResult {
  readonly status: PaymentStatus;
  /** Provider reference, for an approved charge. */
  readonly reference?: string;
  /** Rejection reason, for a rejected charge. */
  readonly reason?: string;
}

/**
 * Charge provider. The template ships a configurable fake one; a real adapter passes `attemptId` as the provider's
 * idempotency key, so repeating the request with the same key does not charge twice, and returns that id in its
 * webhook so that `mark-paid` and `mark-failed` apply it to the right attempt.
 */
export abstract class PaymentProvider {
  /**
   * Requests the charge of the attempt.
   * @param request Charge with the attempt id as the idempotency key.
   * @returns The provider response: approved with its reference, rejected with its reason, or pending.
   */
  abstract charge(request: ProviderCharge): Promise<PaymentResult>;

  /**
   * Queries what the provider answered to an already requested attempt.
   * @param attemptId Idempotency key it was requested with.
   * @returns The response, or `undefined` if the request never reached it.
   */
  abstract find(attemptId: string): Promise<PaymentResult | undefined>;
}

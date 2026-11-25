import type {
  ChargeRequest,
  PaymentResult,
} from '../domain/payment-provider.js';

/** What the provider reports through its webhook about the charge of an invoice. */
export interface PaymentNotice {
  readonly tenantId: string;
  readonly invoiceId: string;
  /** Id of the attempt the provider received as idempotency key, when the charge came from billing. */
  readonly attemptId?: string;
  /** Number the notice takes when it matches no recorded attempt: the next attempt of the invoice. */
  readonly nextAttempt: number;
  readonly result: PaymentResult;
}

/** Invoice charging for `invoices`. */
export abstract class PaymentsFacade {
  /**
   * Requests the charge attempt, or resumes the one left recorded without an answer; never charges the same attempt
   * twice.
   * @param request Invoice, attempt number and amount to charge.
   * @returns The provider's answer, or `Requested` if another run has the attempt in flight.
   */
  abstract charge(request: ChargeRequest): Promise<PaymentResult>;

  /**
   * Records a provider notice on the attempt it refers to: the one named by `attemptId`, or without it the latest
   * attempt if it is still open. A repeated notice records nothing, and a notice never overwrites another result.
   * @param notice Notice from the provider.
   * @returns The number of the attempt the notice belongs to.
   * @throws BillingError `BILLING.INVOICE.NOT_FOUND` if `attemptId` is not an attempt of the invoice, or
   *   `BILLING.INVOICE.INVALID_STATE` if the notice contradicts the result already recorded for its attempt or the
   *   attempt it would take is open on behalf of another charge.
   */
  abstract record(notice: PaymentNotice): Promise<number>;
}

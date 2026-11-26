import { Injectable } from '@nestjs/common';
import type {
  ChargeRequest,
  PaymentResult,
} from '../domain/payment-provider.js';
import { ChargeInvoice } from './charge-invoice.use-case.js';
import { PaymentsFacade, type PaymentNotice } from './payments.facade.js';
import { RecordPaymentResult } from './record-payment-result.use-case.js';

/** `PaymentsFacade` inside the billing process itself. */
@Injectable()
export class LocalPaymentsFacade extends PaymentsFacade {
  constructor(
    private readonly chargeInvoice: ChargeInvoice,
    private readonly recordResult: RecordPaymentResult,
  ) {
    super();
  }

  /**
   * Charges the attempt with `ChargeInvoice`, which never charges the same one twice.
   * @param request Invoice, attempt number and amount to charge.
   * @returns The provider's answer, or `Requested` if another run has the attempt in flight.
   */
  override charge(request: ChargeRequest): Promise<PaymentResult> {
    return this.chargeInvoice.execute(request);
  }

  /**
   * Records the provider notice with `RecordPaymentResult`.
   * @param notice Notice from the provider.
   * @returns The number of the attempt the notice belongs to.
   * @throws BillingError `BILLING.INVOICE.NOT_FOUND` if `attemptId` is not an attempt of the invoice, or
   *   `BILLING.INVOICE.INVALID_STATE` if the notice contradicts the result already recorded for its attempt or the
   *   attempt it would take is open on behalf of another charge.
   */
  override record(notice: PaymentNotice): Promise<number> {
    return this.recordResult.execute(notice);
  }
}

import { Injectable } from '@nestjs/common';
import type {
  ChargeRequest,
  PaymentResult,
} from '../domain/payment-provider.js';
import { ChargeInvoice } from './charge-invoice.use-case.js';
import { PaymentsFacade } from './payments.facade.js';
import { RecordPaymentResult } from './record-payment-result.use-case.js';

@Injectable()
export class LocalPaymentsFacade extends PaymentsFacade {
  constructor(
    private readonly chargeInvoice: ChargeInvoice,
    private readonly recordResult: RecordPaymentResult,
  ) {
    super();
  }

  charge(request: ChargeRequest): Promise<PaymentResult> {
    return this.chargeInvoice.execute(request);
  }

  record(
    tenantId: string,
    invoiceId: string,
    attempt: number,
    result: PaymentResult,
  ): Promise<void> {
    return this.recordResult.execute(tenantId, invoiceId, attempt, result);
  }
}

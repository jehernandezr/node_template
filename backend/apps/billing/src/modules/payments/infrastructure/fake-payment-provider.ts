import { FakePaymentOutcome } from '../../../shared/enums/fake-payment-outcome.enum.js';
import {
  PaymentProvider,
  type ChargeRequest,
  type PaymentResult,
} from '../domain/payment-provider.js';
import { PaymentStatus } from '../domain/payment-status.enum.js';

/** Proveedor de cobro de la plantilla: responde siempre lo que dice `BILLING_FAKE_PAYMENT_OUTCOME`. */
export class FakePaymentProvider extends PaymentProvider {
  constructor(private readonly outcome: FakePaymentOutcome) {
    super();
  }

  async charge(request: ChargeRequest): Promise<PaymentResult> {
    switch (this.outcome) {
      case FakePaymentOutcome.Approved:
        return {
          status: PaymentStatus.Approved,
          reference: `fake-${request.invoiceNumber}`,
        };
      case FakePaymentOutcome.Declined:
        return { status: PaymentStatus.Declined, reason: 'card_declined' };
      case FakePaymentOutcome.Pending:
        return { status: PaymentStatus.Pending };
    }
  }
}

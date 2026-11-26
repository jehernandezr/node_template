import { FakePaymentOutcome } from '../../../shared/enums/fake-payment-outcome.enum.js';
import {
  PaymentProvider,
  type PaymentResult,
  type ProviderCharge,
} from '../domain/payment-provider.js';
import { PaymentStatus } from '../domain/payment-status.enum.js';

/**
 * Template charge provider: always responds with what `BILLING_FAKE_PAYMENT_OUTCOME` says and, like a real one,
 * remembers each attempt by its idempotency key, so repeating the request returns the first response without charging
 * again. What it remembers lives in the process.
 */
export class FakePaymentProvider extends PaymentProvider {
  private readonly answered = new Map<string, PaymentResult>();

  constructor(private readonly outcome: FakePaymentOutcome) {
    super();
  }

  override async charge(request: ProviderCharge): Promise<PaymentResult> {
    const previous = this.answered.get(request.attemptId);
    if (previous !== undefined) {
      return previous;
    }
    const result = this.resultFor(request);
    this.answered.set(request.attemptId, result);
    return result;
  }

  override async find(attemptId: string): Promise<PaymentResult | undefined> {
    return this.answered.get(attemptId);
  }

  private resultFor(request: ProviderCharge): PaymentResult {
    switch (this.outcome) {
      case FakePaymentOutcome.Approved:
        return {
          status: PaymentStatus.Approved,
          reference: `fake-${request.invoiceNumber}-${request.attempt}`,
        };
      case FakePaymentOutcome.Declined:
        return { status: PaymentStatus.Declined, reason: 'card_declined' };
      case FakePaymentOutcome.Pending:
        return { status: PaymentStatus.Pending };
    }
  }
}

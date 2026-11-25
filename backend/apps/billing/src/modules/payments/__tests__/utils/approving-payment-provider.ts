import {
  PaymentProvider,
  type PaymentResult,
  type ProviderCharge,
} from '../../domain/payment-provider.js';
import { PaymentStatus } from '../../domain/payment-status.enum.js';

/** Provider that approves everything and, like a real one, charges only once per idempotency key. */
export class ApprovingPaymentProvider extends PaymentProvider {
  private readonly charged = new Map<string, PaymentResult>();

  async charge(request: ProviderCharge): Promise<PaymentResult> {
    const result = this.charged.get(request.attemptId) ?? {
      status: PaymentStatus.Approved,
      reference: `gateway-${request.attemptId}`,
    };
    this.charged.set(request.attemptId, result);
    return result;
  }

  async find(attemptId: string): Promise<PaymentResult | undefined> {
    return this.charged.get(attemptId);
  }

  /** Distinct charges it made: what the cardholder would see. */
  chargeCount(): number {
    return this.charged.size;
  }
}

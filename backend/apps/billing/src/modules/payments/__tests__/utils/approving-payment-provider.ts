import {
  PaymentProvider,
  type PaymentResult,
  type ProviderCharge,
} from '../../domain/payment-provider.js';
import { PaymentStatus } from '../../domain/payment-status.enum.js';

/** Proveedor que aprueba todo y, como uno real, cobra una sola vez por llave de idempotencia. */
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

  /** Cobros distintos que hizo: lo que vería el titular de la tarjeta. */
  chargeCount(): number {
    return this.charged.size;
  }
}

import { FakePaymentOutcome } from '../../../shared/enums/fake-payment-outcome.enum.js';
import {
  PaymentProvider,
  type PaymentResult,
  type ProviderCharge,
} from '../domain/payment-provider.js';
import { PaymentStatus } from '../domain/payment-status.enum.js';

/**
 * Proveedor de cobro de la plantilla: responde siempre lo que dice `BILLING_FAKE_PAYMENT_OUTCOME` y, como uno real,
 * recuerda cada intento por su llave de idempotencia, así repetir el pedido devuelve la primera respuesta sin cobrar
 * otra vez. Lo recordado vive en el proceso.
 */
export class FakePaymentProvider extends PaymentProvider {
  private readonly answered = new Map<string, PaymentResult>();

  constructor(private readonly outcome: FakePaymentOutcome) {
    super();
  }

  async charge(request: ProviderCharge): Promise<PaymentResult> {
    const previous = this.answered.get(request.attemptId);
    if (previous !== undefined) {
      return previous;
    }
    const result = this.resultFor(request);
    this.answered.set(request.attemptId, result);
    return result;
  }

  async find(attemptId: string): Promise<PaymentResult | undefined> {
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

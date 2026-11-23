import type { PaymentResult } from './payment-provider.js';
import type { PaymentStatus } from './payment-status.enum.js';

/** Bitácora de intentos de cobro del tenant del `ShardScope` abierto. */
export abstract class PaymentAttempts {
  abstract record(
    id: string,
    invoiceId: string,
    result: PaymentResult,
  ): Promise<void>;
  /** Cómo terminó el último intento de cobro de la factura, o `undefined` si nunca se cobró. */
  abstract lastStatus(invoiceId: string): Promise<PaymentStatus | undefined>;
}

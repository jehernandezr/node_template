import type {
  ChargeRequest,
  PaymentResult,
} from '../domain/payment-provider.js';
import type { PaymentStatus } from '../domain/payment-status.enum.js';

/** Lo que `payments` ofrece a los otros módulos. */
export abstract class PaymentsFacade {
  /** Pide el cobro al proveedor y deja el intento en la bitácora. */
  abstract charge(request: ChargeRequest): Promise<PaymentResult>;
  /** Cómo terminó el último intento de cobro de la factura, o `undefined` si nunca se pidió. */
  abstract lastStatus(
    tenantId: string,
    invoiceId: string,
  ): Promise<PaymentStatus | undefined>;
}

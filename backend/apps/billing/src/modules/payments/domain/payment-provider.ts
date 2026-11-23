import type { Currency } from '@contracts/billing';
import type { PaymentStatus } from './payment-status.enum.js';

/** Lo que se le pide cobrar al proveedor: una factura emitida. */
export interface ChargeRequest {
  readonly tenantId: string;
  readonly invoiceId: string;
  readonly invoiceNumber: string;
  readonly amountMinor: number;
  readonly currency: Currency;
}

export interface PaymentResult {
  readonly status: PaymentStatus;
  /** Referencia del proveedor, con un cobro aprobado. */
  readonly reference?: string;
  /** Motivo del rechazo, con un cobro rechazado. */
  readonly reason?: string;
}

/** Proveedor de cobro. El real llega después de F12; la plantilla trae uno falso configurable. */
export abstract class PaymentProvider {
  abstract charge(request: ChargeRequest): Promise<PaymentResult>;
}

import type { Currency } from '@contracts/billing';
import type { PaymentStatus } from './payment-status.enum.js';

/** Lo que se le pide cobrar: el intento `attempt` de una factura emitida. */
export interface ChargeRequest {
  readonly tenantId: string;
  readonly invoiceId: string;
  readonly invoiceNumber: string;
  /** Número del intento de cobro de la factura: el primero es 1 y cada rechazo abre el siguiente. */
  readonly attempt: number;
  readonly amountMinor: number;
  readonly currency: Currency;
}

/** El cobro tal como llega al proveedor, con el id del intento anotado como llave de idempotencia. */
export interface ProviderCharge extends ChargeRequest {
  readonly attemptId: string;
}

export interface PaymentResult {
  readonly status: PaymentStatus;
  /** Referencia del proveedor, con un cobro aprobado. */
  readonly reference?: string;
  /** Motivo del rechazo, con un cobro rechazado. */
  readonly reason?: string;
}

/**
 * Proveedor de cobro. El real llega después de F12; la plantilla trae uno falso configurable. Un adaptador real pasa
 * `attemptId` como llave de idempotencia del proveedor: repetir el pedido con la misma llave no cobra dos veces.
 */
export abstract class PaymentProvider {
  abstract charge(request: ProviderCharge): Promise<PaymentResult>;
  /** Lo que respondió el proveedor al intento, o `undefined` si nunca le llegó. */
  abstract find(attemptId: string): Promise<PaymentResult | undefined>;
}

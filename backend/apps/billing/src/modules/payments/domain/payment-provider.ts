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

/** Respuesta del proveedor a un intento de cobro. */
export interface PaymentResult {
  readonly status: PaymentStatus;
  /** Referencia del proveedor, con un cobro aprobado. */
  readonly reference?: string;
  /** Motivo del rechazo, con un cobro rechazado. */
  readonly reason?: string;
}

/**
 * Proveedor de cobro. La plantilla trae uno falso configurable; un adaptador real pasa `attemptId` como llave de
 * idempotencia del proveedor, así repetir el pedido con la misma llave no cobra dos veces, y devuelve ese id en su
 * webhook para que `mark-paid` y `mark-failed` lo apliquen al intento correcto.
 */
export abstract class PaymentProvider {
  /**
   * Pide el cobro del intento.
   * @param request Cobro con el id del intento como llave de idempotencia.
   * @returns La respuesta del proveedor: aprobado con su referencia, rechazado con su motivo o pendiente.
   */
  abstract charge(request: ProviderCharge): Promise<PaymentResult>;

  /**
   * Consulta lo que respondió el proveedor a un intento ya pedido.
   * @param attemptId Llave de idempotencia con que se pidió.
   * @returns La respuesta, o `undefined` si el pedido nunca le llegó.
   */
  abstract find(attemptId: string): Promise<PaymentResult | undefined>;
}

import { PaymentStatus } from './payment-status.enum.js';

/** Un intento de cobro de una factura, anotado antes de pedirlo al proveedor. */
export interface PaymentAttempt {
  readonly id: string;
  readonly invoiceId: string;
  /** Número del intento dentro de la factura: hay a lo sumo un intento por número. */
  readonly attempt: number;
  readonly status: PaymentStatus;
  readonly requestedAt: Date;
  /** Referencia del proveedor, con un cobro aprobado. */
  readonly reference?: string;
  /** Motivo del rechazo, con un cobro rechazado. */
  readonly reason?: string;
}

/** Estados de un intento que todavía espera la respuesta final del proveedor. */
export const OPEN_PAYMENT_STATUSES: ReadonlySet<PaymentStatus> = new Set([
  PaymentStatus.Requested,
  PaymentStatus.Pending,
]);

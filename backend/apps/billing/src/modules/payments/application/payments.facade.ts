import type {
  ChargeRequest,
  PaymentResult,
} from '../domain/payment-provider.js';

/** Cobro de facturas para `invoices`. */
export abstract class PaymentsFacade {
  /**
   * Pide el intento de cobro, o retoma el que quedó anotado sin respuesta; nunca cobra dos veces el mismo intento.
   * `Requested` si otra corrida lo tiene en vuelo.
   */
  abstract charge(request: ChargeRequest): Promise<PaymentResult>;
  /** Anota lo que el proveedor informó por su webhook para el intento `attempt` de la factura. */
  abstract record(
    tenantId: string,
    invoiceId: string,
    attempt: number,
    result: PaymentResult,
  ): Promise<void>;
}

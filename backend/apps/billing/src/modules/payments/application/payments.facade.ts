import type {
  ChargeRequest,
  PaymentResult,
} from '../domain/payment-provider.js';

/** Lo que el proveedor informa por su webhook sobre el cobro de una factura. */
export interface PaymentNotice {
  readonly tenantId: string;
  readonly invoiceId: string;
  /** Id del intento que el proveedor recibió como llave de idempotencia, si el cobro salió de billing. */
  readonly attemptId?: string;
  /** Número que toma el aviso si no corresponde a ningún intento anotado: el próximo intento de la factura. */
  readonly nextAttempt: number;
  readonly result: PaymentResult;
}

/** Cobro de facturas para `invoices`. */
export abstract class PaymentsFacade {
  /**
   * Pide el intento de cobro, o retoma el que quedó anotado sin respuesta; nunca cobra dos veces el mismo intento.
   * @param request Factura, número de intento y monto a cobrar.
   * @returns La respuesta del proveedor, o `Requested` si otra corrida tiene el intento en vuelo.
   */
  abstract charge(request: ChargeRequest): Promise<PaymentResult>;

  /**
   * Anota un aviso del proveedor en el intento al que se refiere: el de `attemptId`, o sin él el último intento si
   * sigue abierto. Un aviso repetido no anota nada.
   * @param notice Aviso del proveedor.
   * @returns El número del intento al que corresponde el aviso.
   * @throws BillingError `BILLING.INVOICE.NOT_FOUND` si `attemptId` no es un intento de la factura.
   */
  abstract record(notice: PaymentNotice): Promise<number>;
}

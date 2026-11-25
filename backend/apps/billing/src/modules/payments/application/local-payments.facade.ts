import { Injectable } from '@nestjs/common';
import type {
  ChargeRequest,
  PaymentResult,
} from '../domain/payment-provider.js';
import { ChargeInvoice } from './charge-invoice.use-case.js';
import { PaymentsFacade, type PaymentNotice } from './payments.facade.js';
import { RecordPaymentResult } from './record-payment-result.use-case.js';

/** `PaymentsFacade` dentro del mismo proceso de billing. */
@Injectable()
export class LocalPaymentsFacade extends PaymentsFacade {
  constructor(
    private readonly chargeInvoice: ChargeInvoice,
    private readonly recordResult: RecordPaymentResult,
  ) {
    super();
  }

  /**
   * Cobra el intento con `ChargeInvoice`, que nunca cobra dos veces el mismo.
   * @param request Factura, número de intento y monto a cobrar.
   * @returns La respuesta del proveedor, o `Requested` si otra corrida tiene el intento en vuelo.
   */
  charge(request: ChargeRequest): Promise<PaymentResult> {
    return this.chargeInvoice.execute(request);
  }

  /**
   * Anota el aviso del proveedor con `RecordPaymentResult`.
   * @param notice Aviso del proveedor.
   * @returns El número del intento al que corresponde el aviso.
   * @throws BillingError `BILLING.INVOICE.NOT_FOUND` si `attemptId` no es un intento de la factura.
   */
  record(notice: PaymentNotice): Promise<number> {
    return this.recordResult.execute(notice);
  }
}

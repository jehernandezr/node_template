import { Injectable } from '@nestjs/common';
import {
  ListInvoiceChangesOperation,
  MarkInvoiceFailedOperation,
  MarkInvoicePaidOperation,
  type InvoiceChangePage,
  type InvoiceStateResult,
  type ListInvoiceChangesInput,
  type MarkInvoiceFailedInput,
  type MarkInvoicePaidInput,
} from '@contracts/billing';
import type { HandlerResult } from '@platform/internal-api';
import { InternalHandler } from '@platform/internal-api/nest';
import { CallOutcome } from '@platform/primitives';
import { InvoiceQueries } from '../application/invoice-queries.js';
import { RecordPaymentNotice } from '../application/record-payment-notice.use-case.js';
import type { InvoiceState } from '../domain/invoice.js';

/**
 * El resultado de un cobro que el proveedor informa después, como lo haría su webhook, y la historia de
 * facturas con que otro servicio rellena su copia.
 */
@Injectable()
export class InvoicesInternalOperations {
  constructor(
    private readonly notices: RecordPaymentNotice,
    private readonly queries: InvoiceQueries,
  ) {}

  /**
   * Una página de la historia de facturas del tenant, de la más nueva a la más vieja.
   * @param input Tenant, tamaño de página y cursor.
   * @returns La página y el cursor de la siguiente.
   */
  @InternalHandler(ListInvoiceChangesOperation)
  async listChanges(
    input: ListInvoiceChangesInput,
  ): Promise<HandlerResult<InvoiceChangePage>> {
    return {
      outcome: CallOutcome.success(await this.queries.changes(input)),
    };
  }

  /**
   * Aplica el pago que informa el proveedor en el intento al que se refiere.
   * @param input Aviso de pago con su referencia, su monto y el intento, si salió de billing.
   * @returns El estado de la factura.
   * @throws BillingError `BILLING.INVOICE.NOT_FOUND`, `BILLING.INVOICE.INVALID_STATE` o
   *   `BILLING.INVOICE.AMOUNT_MISMATCH`.
   */
  @InternalHandler(MarkInvoicePaidOperation)
  async markPaid(
    input: MarkInvoicePaidInput,
  ): Promise<HandlerResult<InvoiceStateResult>> {
    return InvoicesInternalOperations.stateOf(
      await this.notices.paid({
        tenantId: input.tenantId,
        invoiceId: input.invoiceId,
        paidAt: new Date(input.paidAt),
        reference: input.reference,
        amount: input.amount,
        ...(input.attemptId === undefined
          ? {}
          : { attemptId: input.attemptId }),
      }),
    );
  }

  /**
   * Aplica el rechazo que informa el proveedor en el intento al que se refiere; repetirlo no gasta un reintento.
   * @param input Aviso de rechazo con su motivo y el intento, si salió de billing.
   * @returns El estado de la factura.
   * @throws BillingError `BILLING.INVOICE.NOT_FOUND` o `BILLING.INVOICE.INVALID_STATE`.
   */
  @InternalHandler(MarkInvoiceFailedOperation)
  async markFailed(
    input: MarkInvoiceFailedInput,
  ): Promise<HandlerResult<InvoiceStateResult>> {
    return InvoicesInternalOperations.stateOf(
      await this.notices.failed({
        tenantId: input.tenantId,
        invoiceId: input.invoiceId,
        failedAt: new Date(input.failedAt),
        ...(input.reason === undefined ? {} : { reason: input.reason }),
        ...(input.attemptId === undefined
          ? {}
          : { attemptId: input.attemptId }),
      }),
    );
  }

  private static stateOf(
    invoice: InvoiceState,
  ): HandlerResult<InvoiceStateResult> {
    return {
      outcome: CallOutcome.success({
        invoiceId: invoice.id,
        status: invoice.status,
      }),
    };
  }
}

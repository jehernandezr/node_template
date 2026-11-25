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

  @InternalHandler(ListInvoiceChangesOperation)
  async listChanges(
    input: ListInvoiceChangesInput,
  ): Promise<HandlerResult<InvoiceChangePage>> {
    return {
      outcome: CallOutcome.success(await this.queries.changes(input)),
    };
  }

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
      }),
    );
  }

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

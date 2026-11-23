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
import { SettleInvoice } from '../application/settle-invoice.use-case.js';

/**
 * El resultado de un cobro que el proveedor informa después, como lo haría su webhook, y la historia de
 * facturas con que otro servicio rellena su copia.
 */
@Injectable()
export class InvoicesInternalOperations {
  constructor(
    private readonly settle: SettleInvoice,
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
    const invoice = await this.settle.paid(
      input.tenantId,
      input.invoiceId,
      new Date(input.paidAt),
    );
    return {
      outcome: CallOutcome.success({
        invoiceId: invoice.id,
        status: invoice.status,
      }),
    };
  }

  @InternalHandler(MarkInvoiceFailedOperation)
  async markFailed(
    input: MarkInvoiceFailedInput,
  ): Promise<HandlerResult<InvoiceStateResult>> {
    const invoice = await this.settle.failed(
      input.tenantId,
      input.invoiceId,
      new Date(input.failedAt),
    );
    return {
      outcome: CallOutcome.success({
        invoiceId: invoice.id,
        status: invoice.status,
      }),
    };
  }
}

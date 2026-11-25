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
 * The result of a charge that the provider reports later, as its webhook would, and the invoice history
 * another service uses to backfill its copy.
 */
@Injectable()
export class InvoicesInternalOperations {
  constructor(
    private readonly notices: RecordPaymentNotice,
    private readonly queries: InvoiceQueries,
  ) {}

  /**
   * Returns a page of the tenant's invoice history, newest to oldest.
   * @param input Tenant, page size and cursor.
   * @returns The page and the cursor of the next one.
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
   * Applies the payment reported by the provider to the attempt it refers to.
   * @param input Payment notice with its reference, its amount and the attempt, if it came from billing.
   * @returns The invoice state.
   * @throws BillingError `BILLING.INVOICE.NOT_FOUND`, `BILLING.INVOICE.INVALID_STATE` or
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
   * Applies the rejection reported by the provider to the attempt it refers to; repeating it does not use up a retry.
   * @param input Rejection notice with its reason and the attempt, if it came from billing.
   * @returns The invoice state.
   * @throws BillingError `BILLING.INVOICE.NOT_FOUND` or `BILLING.INVOICE.INVALID_STATE`.
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

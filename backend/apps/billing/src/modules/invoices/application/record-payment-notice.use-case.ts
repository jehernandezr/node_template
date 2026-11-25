import { ShardScopes } from '@platform/persistence';
import { Injectable } from '@nestjs/common';
import { BillingErrorCode } from '@contracts/billing';
import { TransactionManager } from '@platform/kernel';
import { BillingError } from '../../../shared/errors/billing.error.js';
import {
  PaymentsFacade,
  PaymentStatus,
  type PaymentNotice,
} from '../../payments/index.js';
import { SubscriptionsFacade } from '../../subscriptions/index.js';
import { InvoiceRepository } from '../domain/invoice.repository.js';
import type { Invoice, InvoiceState } from '../domain/invoice.js';
import { SettleInvoice } from './settle-invoice.use-case.js';

/** A payment the provider confirms after it was requested. */
export interface PaidNotice {
  readonly tenantId: string;
  readonly invoiceId: string;
  /** Attempt the provider received as idempotency key, when the charge came from billing. */
  readonly attemptId?: string;
  readonly paidAt: Date;
  readonly reference: string;
  readonly amount: { readonly amountMinor: number; readonly currency: string };
}

/** A decline the provider confirms after it was requested. */
export interface FailedNotice {
  readonly tenantId: string;
  readonly invoiceId: string;
  /** Attempt the provider received as idempotency key, when the charge came from billing. */
  readonly attemptId?: string;
  readonly failedAt: Date;
  readonly reason?: string;
}

/**
 * What the provider reports through its webhook: records the result, with its reference or its reason, on the attempt
 * the notice refers to and applies it to the invoice, all in one transaction with the subscription locked. The attempt
 * comes from the notice and not from the state of the invoice: a repeated notice does not count as a new decline nor
 * use up a retry. A payment for an amount other than the total, or a notice that contradicts the result already
 * recorded for its attempt, is refused without changing anything.
 */
@Injectable()
export class RecordPaymentNotice {
  constructor(
    private readonly invoices: InvoiceRepository,
    private readonly payments: PaymentsFacade,
    private readonly settle: SettleInvoice,
    private readonly subscriptions: SubscriptionsFacade,
    private readonly shard: ShardScopes,
    private readonly transactions: TransactionManager,
  ) {}

  /**
   * Records the payment on its attempt and settles the invoice; repeating the notice changes nothing.
   * @param notice Payment reported by the provider.
   * @returns The invoice after the notice.
   * @throws BillingError `BILLING.INVOICE.NOT_FOUND` if the invoice or the attempt do not exist,
   *   `BILLING.INVOICE.INVALID_STATE` if the invoice is void or the attempt already has another result, or
   *   `BILLING.INVOICE.AMOUNT_MISMATCH` if the amount is not the total.
   */
  paid(notice: PaidNotice): Promise<InvoiceState> {
    return this.inTransaction(
      notice.tenantId,
      notice.invoiceId,
      async (invoice) => {
        invoice.assertTotal(notice.amount);
        await this.payments.record({
          ...RecordPaymentNotice.attemptOf(notice, invoice),
          result: {
            status: PaymentStatus.Approved,
            reference: notice.reference,
          },
        });
        return this.settle.paid(
          notice.tenantId,
          notice.invoiceId,
          notice.paidAt,
        );
      },
    );
  }

  /**
   * Records the decline on its attempt and applies it to the invoice once: a repeated notice, or the webhook of a
   * decline the job already recorded, does not schedule another retry.
   * @param notice Decline reported by the provider.
   * @returns The invoice after the notice.
   * @throws BillingError `BILLING.INVOICE.NOT_FOUND` if the invoice or the attempt do not exist, or
   *   `BILLING.INVOICE.INVALID_STATE` if the invoice is already paid or void or the attempt already has another
   *   result.
   */
  failed(notice: FailedNotice): Promise<InvoiceState> {
    return this.inTransaction(
      notice.tenantId,
      notice.invoiceId,
      async (invoice) => {
        const attempt = await this.payments.record({
          ...RecordPaymentNotice.attemptOf(notice, invoice),
          result: {
            status: PaymentStatus.Declined,
            ...(notice.reason === undefined ? {} : { reason: notice.reason }),
          },
        });
        return this.settle.failed(
          notice.tenantId,
          notice.invoiceId,
          notice.failedAt,
          attempt,
        );
      },
    );
  }

  private static attemptOf(
    notice: PaidNotice | FailedNotice,
    invoice: Invoice,
  ): Omit<PaymentNotice, 'result'> {
    return {
      tenantId: notice.tenantId,
      invoiceId: notice.invoiceId,
      nextAttempt: invoice.collectionAttempt(),
      ...(notice.attemptId === undefined
        ? {}
        : { attemptId: notice.attemptId }),
    };
  }

  private inTransaction(
    tenantId: string,
    invoiceId: string,
    apply: (invoice: Invoice) => Promise<InvoiceState>,
  ): Promise<InvoiceState> {
    return this.shard.inTenantShard(tenantId, () =>
      this.transactions.runInTransaction(async () => {
        await this.subscriptions.lock(tenantId);
        const invoice = await this.invoices.find(invoiceId);
        if (invoice === undefined) {
          throw new BillingError(BillingErrorCode.InvoiceNotFound);
        }
        return apply(invoice);
      }),
    );
  }
}

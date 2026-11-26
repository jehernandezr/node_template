import { ShardScopes } from '@platform/persistence';
import { Injectable } from '@nestjs/common';
import {
  BillingErrorCode,
  InvoiceFailedEvent,
  InvoicePaidEvent,
  InvoiceStatus,
} from '@contracts/billing';
import { TransactionManager } from '@platform/kernel';
import { MessageBus } from '@platform/messaging';
import { BillingError } from '../../../shared/errors/billing.error.js';
import { SubscriptionsFacade } from '../../subscriptions/index.js';
import { CollectionRetrySchedule } from '../domain/collection-retry-schedule.js';
import { InvoiceRepository } from '../domain/invoice.repository.js';
import type { Invoice, InvoiceState } from '../domain/invoice.js';

/**
 * Applies the result of a charge to the invoice and the subscription: a payment settles it and reactivates a past-due
 * subscription that no longer owes another failed invoice; a rejection schedules the retry and leaves the subscription
 * past due. Each change first takes the subscription with `FOR UPDATE`: two concurrent payments of different invoices
 * see each other and the second one reactivates. Repeating the same result does not publish again.
 */
@Injectable()
export class SettleInvoice {
  constructor(
    private readonly invoices: InvoiceRepository,
    private readonly subscriptions: SubscriptionsFacade,
    private readonly bus: MessageBus,
    private readonly shard: ShardScopes,
    private readonly transactions: TransactionManager,
  ) {}

  /**
   * Marks an invoice paid and reactivates the subscription if it was past due or suspended.
   * @param tenantId Tenant that owns the invoice.
   * @param invoiceId Invoice that was paid.
   * @param paidAt Instant of the payment.
   * @returns The paid invoice.
   * @throws BillingError `BILLING.INVOICE.NOT_FOUND` or `BILLING.INVOICE.INVALID_STATE`.
   */
  paid(
    tenantId: string,
    invoiceId: string,
    paidAt: Date,
  ): Promise<InvoiceState> {
    return this.change(tenantId, invoiceId, async (invoice) => {
      if (!invoice.pay(paidAt)) {
        return;
      }
      await this.invoices.update(invoice);
      const state = invoice.snapshot();
      await this.bus.publish(
        InvoicePaidEvent,
        {
          tenantId,
          invoiceId,
          number: state.number,
          total: { amountMinor: state.totalMinor, currency: state.currency },
          paidAt: paidAt.toISOString(),
        },
        { tenantId },
      );
      if (!(await this.invoices.any(InvoiceStatus.Failed))) {
        await this.subscriptions.settle(tenantId);
      }
    });
  }

  /**
   * Records the rejection of attempt `attempt`.
   * @param tenantId Tenant that owns the invoice.
   * @param invoiceId Invoice whose charge was declined.
   * @param failedAt Instant of the rejection.
   * @param attempt Number of the attempt that failed.
   * @returns The invoice with the failure and its next retry.
   * @throws BillingError `BILLING.INVOICE.NOT_FOUND` or `BILLING.INVOICE.INVALID_STATE`.
   */
  failed(
    tenantId: string,
    invoiceId: string,
    failedAt: Date,
    attempt: number,
  ): Promise<InvoiceState> {
    return this.change(tenantId, invoiceId, async (invoice) => {
      if (!invoice.fail(failedAt, attempt, CollectionRetrySchedule.STANDARD)) {
        return;
      }
      await this.invoices.update(invoice);
      const state = invoice.snapshot();
      await this.bus.publish(
        InvoiceFailedEvent,
        {
          tenantId,
          invoiceId,
          number: state.number,
          total: { amountMinor: state.totalMinor, currency: state.currency },
          attempts: state.failedAttempts,
          failedAt: failedAt.toISOString(),
        },
        { tenantId },
      );
      await this.subscriptions.markPastDue(tenantId);
    });
  }

  private change(
    tenantId: string,
    invoiceId: string,
    apply: (invoice: Invoice) => Promise<void>,
  ): Promise<InvoiceState> {
    return this.shard.inTenantShard(tenantId, () =>
      this.transactions.runInTransaction(async () => {
        await this.subscriptions.lock(tenantId);
        const invoice = await this.invoices.find(invoiceId);
        if (invoice === undefined) {
          throw new BillingError(BillingErrorCode.InvoiceNotFound);
        }
        await apply(invoice);
        return invoice.snapshot();
      }),
    );
  }
}

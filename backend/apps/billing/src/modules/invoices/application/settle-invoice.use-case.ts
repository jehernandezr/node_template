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
import { TenantShard } from '../../../shared/utils/tenant-shard.js';
import { SubscriptionsFacade } from '../../subscriptions/index.js';
import { InvoiceRepository } from '../domain/invoice.repository.js';
import type { Invoice, InvoiceState } from '../domain/invoice.js';

/**
 * Aplica el resultado de un cobro a la factura y a la suscripción: un pago la salda y reactiva a una morosa
 * que ya no debe otra factura fallida; un fallo deja morosa a la suscripción. Repetir el mismo resultado no publica de nuevo.
 */
@Injectable()
export class SettleInvoice {
  constructor(
    private readonly invoices: InvoiceRepository,
    private readonly subscriptions: SubscriptionsFacade,
    private readonly bus: MessageBus,
    private readonly shard: TenantShard,
    private readonly transactions: TransactionManager,
  ) {}

  /** @throws BillingError `BILLING.INVOICE.NOT_FOUND` o `BILLING.INVOICE.INVALID_STATE`. */
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

  /** @throws BillingError `BILLING.INVOICE.NOT_FOUND` o `BILLING.INVOICE.INVALID_STATE`. */
  failed(
    tenantId: string,
    invoiceId: string,
    failedAt: Date,
  ): Promise<InvoiceState> {
    return this.change(tenantId, invoiceId, async (invoice) => {
      if (!invoice.fail()) {
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
    return this.shard.run(tenantId, () =>
      this.transactions.runInTransaction(async () => {
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

import { Injectable } from '@nestjs/common';
import { Clock } from '@platform/kernel';
import { LoggerPort } from '@platform/observability';
import { TenantShard } from '../../../shared/utils/tenant-shard.js';
import { PaymentsFacade, PaymentStatus } from '../../payments/index.js';
import { InvoiceRepository } from '../domain/invoice.repository.js';
import type { InvoiceState } from '../domain/invoice.js';
import { SettleInvoice } from './settle-invoice.use-case.js';

/**
 * Charges an invoice that is due for collection (newly issued or with an overdue retry) and applies the result. Each
 * attempt carries its number, so `payments` never charges it twice: if a previous run already charged it and crashed
 * before settling, that response is applied here. A pending charge is left to the webhook or the next run.
 */
@Injectable()
export class CollectInvoice {
  constructor(
    private readonly invoices: InvoiceRepository,
    private readonly payments: PaymentsFacade,
    private readonly settle: SettleInvoice,
    private readonly shard: TenantShard,
    private readonly clock: Clock,
    private readonly logger: LoggerPort,
  ) {}

  async execute(tenantId: string, invoiceId: string): Promise<void> {
    const invoice = await this.shard.run(tenantId, () =>
      this.invoices.find(invoiceId),
    );
    if (
      invoice === undefined ||
      !invoice.isDueForCollection(this.clock.now())
    ) {
      return;
    }
    const state = invoice.snapshot();
    const attempt = invoice.collectionAttempt();
    const status = await this.outcomeOf(tenantId, state, attempt);
    if (status === PaymentStatus.Approved) {
      await this.settle.paid(tenantId, invoiceId, this.clock.now());
    } else if (status === PaymentStatus.Declined) {
      await this.settle.failed(tenantId, invoiceId, this.clock.now(), attempt);
    }
  }

  /**
   * A zero or negative invoice is settled without a charge: the provider is never asked for a negative charge. A
   * negative total comes from a plan price that changed within the period; there is no credit balance to carry over, so it
   * is logged so that a credit note is issued manually.
   */
  private async outcomeOf(
    tenantId: string,
    invoice: InvoiceState,
    attempt: number,
  ): Promise<PaymentStatus> {
    if (invoice.totalMinor < 0) {
      this.logger.warn('invoice with a negative total settled without charge', {
        tenantId,
        invoiceId: invoice.id,
        totalMinor: invoice.totalMinor,
      });
    }
    if (invoice.totalMinor <= 0) {
      return PaymentStatus.Approved;
    }
    const result = await this.payments.charge({
      tenantId,
      invoiceId: invoice.id,
      invoiceNumber: invoice.number,
      attempt,
      amountMinor: invoice.totalMinor,
      currency: invoice.currency,
    });
    return result.status;
  }
}

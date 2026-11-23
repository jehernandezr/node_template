import { Injectable } from '@nestjs/common';
import { InvoiceIssuedEvent } from '@contracts/billing';
import { AppConfig } from '@platform/config';
import { Clock, IdGenerator, TransactionManager } from '@platform/kernel';
import { MessageBus } from '@platform/messaging';
import type { BillingConfig } from '../../../config/billing.config.js';
import { BillingDefaults } from '../../../shared/constants/billing-defaults.constants.js';
import { TenantShard } from '../../../shared/utils/tenant-shard.js';
import { SubscriptionsFacade } from '../../subscriptions/index.js';
import { UsageFacade } from '../../usage/index.js';
import { InvoiceComposer } from '../domain/invoice-composer.js';
import { InvoiceNumbering } from '../domain/invoice-numbering.js';
import { InvoiceRepository } from '../domain/invoice.repository.js';
import { Invoice, type InvoiceState } from '../domain/invoice.js';

/**
 * Cierra el periodo vencido de la suscripción y emite su factura con el siguiente consecutivo, todo en una
 * transacción con `billing.invoice.issued.v1`. Una prueba que termina no se factura.
 */
@Injectable()
export class IssueInvoice {
  private readonly series: string;

  constructor(
    private readonly invoices: InvoiceRepository,
    private readonly numbering: InvoiceNumbering,
    private readonly subscriptions: SubscriptionsFacade,
    private readonly usage: UsageFacade,
    private readonly bus: MessageBus,
    private readonly shard: TenantShard,
    private readonly transactions: TransactionManager,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
    config: AppConfig,
  ) {
    this.series = config.root<BillingConfig>().BILLING_INVOICE_SERIES;
  }

  execute(tenantId: string, today: string): Promise<InvoiceState | undefined> {
    return this.shard.run(tenantId, () =>
      this.transactions.runInTransaction(async () => {
        const closed = await this.subscriptions.closePeriod(tenantId, today);
        if (closed === undefined) {
          return undefined;
        }
        const plan = closed.plan.snapshot();
        const invoice = Invoice.issue({
          id: this.ids.next().toString(),
          number: await this.nextNumber(),
          periodStart: closed.start,
          periodEnd: closed.end,
          currency: plan.currency,
          lines: InvoiceComposer.lines({
            start: closed.start,
            end: closed.end,
            plan,
            prorationMinor: closed.prorationMinor,
            usage: await this.usage.levels(tenantId, closed.start, closed.end),
          }),
          now: this.clock.now(),
        });
        await this.invoices.insert(invoice);
        const state = invoice.snapshot();
        await this.bus.publish(
          InvoiceIssuedEvent,
          {
            tenantId,
            invoiceId: state.id,
            number: state.number,
            period: { start: state.periodStart, end: state.periodEnd },
            total: { amountMinor: state.totalMinor, currency: state.currency },
            issuedAt: state.issuedAt.toISOString(),
          },
          { tenantId },
        );
        return state;
      }),
    );
  }

  private async nextNumber(): Promise<string> {
    const sequence = await this.numbering.next(this.series);
    return `${this.series}-${String(sequence).padStart(BillingDefaults.invoiceNumberDigits, '0')}`;
  }
}

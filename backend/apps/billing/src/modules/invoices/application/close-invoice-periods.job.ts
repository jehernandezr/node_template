import { Injectable } from '@nestjs/common';
import {
  Clock,
  JobScheduleKind,
  ScheduledJob,
  type JobSchedule,
} from '@platform/kernel';
import { LoggerPort } from '@platform/observability';
import { BillingJob } from '../../../shared/enums/billing-job.enum.js';
import {
  BillingPeriod,
  SubscriptionsFacade,
} from '../../subscriptions/index.js';
import { InvoiceMaintenance } from '../domain/invoice-maintenance.js';
import { CollectInvoice } from './collect-invoice.use-case.js';
import { IssueInvoice } from './issue-invoice.use-case.js';

/**
 * Cada día cierra los periodos vencidos (la prueba que termina se activa sin factura) y después cobra toda
 * factura emitida sin cobrar, también las que una corrida anterior emitió y no alcanzó a cobrar. El cobro va
 * fuera de la transacción de la factura porque es una llamada externa. Un tenant que falla no detiene a los
 * demás: la siguiente corrida lo retoma.
 */
@Injectable()
export class CloseInvoicePeriodsJob extends ScheduledJob {
  readonly name = BillingJob.CloseInvoicePeriods;
  readonly schedule: JobSchedule = {
    kind: JobScheduleKind.Interval,
    everyMs: 24 * 60 * 60_000,
  };
  override readonly exclusive = true;
  override readonly timeoutMs = 15 * 60_000;

  constructor(
    private readonly subscriptions: SubscriptionsFacade,
    private readonly issue: IssueInvoice,
    private readonly invoices: InvoiceMaintenance,
    private readonly collect: CollectInvoice,
    private readonly clock: Clock,
    private readonly logger: LoggerPort,
  ) {
    super();
  }

  async run(): Promise<void> {
    await this.closeDuePeriods();
    await this.collectIssuedInvoices();
  }

  private async closeDuePeriods(): Promise<void> {
    const today = BillingPeriod.dateOf(this.clock.now());
    for (const tenantId of await this.subscriptions.dueForClosing(today)) {
      try {
        await this.issue.execute(tenantId, today);
      } catch (error) {
        this.logger.error('invoice period not closed', { tenantId, error });
      }
    }
  }

  private async collectIssuedInvoices(): Promise<void> {
    for (const { tenantId, invoiceId } of await this.invoices.uncollected()) {
      try {
        await this.collect.execute(tenantId, invoiceId);
      } catch (error) {
        this.logger.error('invoice not collected', {
          tenantId,
          invoiceId,
          error,
        });
      }
    }
  }
}

import { Injectable } from '@nestjs/common';
import {
  Clock,
  JobScheduleKind,
  ScheduledJob,
  type JobContext,
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
 * Closes expired periods (an ending trial is activated without an invoice) and then charges every invoice that is due
 * for collection: newly issued ones, the ones a previous run did not reach and the retries of rejected ones. Runs at
 * a fixed minute of every hour in UTC rather than periodically from startup: with frequent deployments a one-day
 * interval would never elapse. Closing and charging are idempotent, so repeating it within the day does not invoice twice.
 * The charge happens outside the invoice transaction because it is an external call. Between invoices it honors the
 * job signal: once its deadline passes it releases the lock and another replica can start. A failing tenant does not
 * stop the others: the next run picks it up.
 */
@Injectable()
export class CloseInvoicePeriodsJob extends ScheduledJob {
  readonly name = BillingJob.CloseInvoicePeriods;
  readonly schedule: JobSchedule = {
    kind: JobScheduleKind.Cron,
    expression: '5 * * * *',
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

  /**
   * Closes expired periods and charges the due invoices, checking the signal between tenants.
   * @param context Run context, with its abort signal.
   * @throws AbortError if the signal fires in the middle of the run.
   */
  async run(context: JobContext): Promise<void> {
    await this.closeDuePeriods(context.signal);
    await this.collectDueInvoices(context.signal);
  }

  private async closeDuePeriods(signal: AbortSignal): Promise<void> {
    const today = BillingPeriod.dateOf(this.clock.now());
    for (const tenantId of await this.subscriptions.dueForClosing(today)) {
      signal.throwIfAborted();
      try {
        await this.issue.execute(tenantId, today);
      } catch (error) {
        this.logger.error('invoice period not closed', { tenantId, error });
      }
    }
  }

  private async collectDueInvoices(signal: AbortSignal): Promise<void> {
    const due = await this.invoices.dueForCollection(this.clock.now());
    for (const { tenantId, invoiceId } of due) {
      signal.throwIfAborted();
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

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
 * Cierra los periodos vencidos (la prueba que termina se activa sin factura) y después cobra cada factura a la que le
 * toca cobro: las recién emitidas, las que una corrida anterior no alcanzó y los reintentos de las rechazadas. Corre a
 * una hora fija de cada hora en UTC y no cada tanto desde el arranque: con despliegues seguidos un intervalo de un día
 * no llegaría a cumplirse nunca. Cerrar y cobrar son idempotentes, así que repetirlo en el día no factura dos veces.
 * El cobro va fuera de la transacción de la factura porque es una llamada externa. Entre factura y factura respeta la
 * señal del job: pasado su plazo suelta el lock y otra réplica puede empezar. Un tenant que falla no detiene a los
 * demás: la siguiente corrida lo retoma.
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

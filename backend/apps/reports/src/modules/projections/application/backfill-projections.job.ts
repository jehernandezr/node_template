import { ShardScopes } from '@platform/persistence';
import { Injectable } from '@nestjs/common';
import {
  JobScheduleKind,
  ScheduledJob,
  TransactionManager,
  type JobSchedule,
} from '@platform/kernel';
import { LoggerPort } from '@platform/observability';
import { ReportsDefaults } from '../../../shared/constants/reports-defaults.constants.js';
import { ReportsJob } from '../../../shared/enums/reports-job.enum.js';
import {
  BackfillProgress,
  BackfillSource,
  type Backfill,
} from '../domain/backfill-progress.js';
import {
  FinanceProjection,
  InvoiceProgress,
} from '../domain/finance-projection.js';
import { InvoiceHistory } from '../domain/invoice-history.js';
import { ReportTenants } from '../domain/report-tenants.js';
import { TaskHistory } from '../domain/task-history.js';
import { TaskCompletion, TaskProjection } from '../domain/task-projection.js';

/**
 * Backfills the task and invoice projections of the tenants that existed before reports, paging through
 * `tasks.tasks.list-changes.v1` and `billing.invoices.list-changes.v1` to the end, with one cursor per source;
 * then marks that source as backfilled. Each source of each tenant advances separately: if one fails, the others
 * continue and the next run picks it up.
 *
 * The backfill and new events merge without duplicating or going backwards: a task carries its version and an
 * invoice the progress of its status. The task history does not include the completion date: a completed task takes
 * the date of its last change.
 */
@Injectable()
export class BackfillProjectionsJob extends ScheduledJob {
  readonly name = ReportsJob.BackfillProjections;
  readonly schedule: JobSchedule = {
    kind: JobScheduleKind.Interval,
    everyMs: 10 * 60_000,
  };
  override readonly exclusive = true;

  constructor(
    private readonly tenants: ReportTenants,
    private readonly taskHistory: TaskHistory,
    private readonly invoiceHistory: InvoiceHistory,
    private readonly tasks: TaskProjection,
    private readonly finance: FinanceProjection,
    private readonly progress: BackfillProgress,
    private readonly shard: ShardScopes,
    private readonly transactions: TransactionManager,
    private readonly logger: LoggerPort,
  ) {
    super();
  }

  async run(): Promise<void> {
    for (const tenantId of await this.tenants.active()) {
      await this.backfill(tenantId, BackfillSource.Tasks, (cursor) =>
        this.copyTasks(tenantId, cursor),
      );
      await this.backfill(tenantId, BackfillSource.Invoices, (cursor) =>
        this.copyInvoices(tenantId, cursor),
      );
    }
  }

  private async backfill(
    tenantId: string,
    source: BackfillSource,
    copyPage: (cursor: string | undefined) => Promise<Backfill>,
  ): Promise<void> {
    try {
      await this.shard.inTenantShard(tenantId, async () => {
        let backfill = await this.progress.find(source);
        for (
          let page = 0;
          page < ReportsDefaults.backfillPagesPerRun && !backfill.completed;
          page += 1
        ) {
          backfill = await copyPage(backfill.cursor);
        }
      });
    } catch (error) {
      this.logger.error('projection not backfilled', {
        tenantId,
        source,
        error,
      });
    }
  }

  private async copyTasks(
    tenantId: string,
    cursor: string | undefined,
  ): Promise<Backfill> {
    const changes = await this.taskHistory.page(
      tenantId,
      cursor,
      ReportsDefaults.backfillPageSize,
    );
    return this.saveCopied(
      BackfillSource.Tasks,
      changes.nextCursor,
      async () => {
        for (const task of changes.items) {
          const done = TaskCompletion.isDone(task.status);
          await this.tasks.apply({
            taskId: task.id,
            version: task.version,
            status: task.status,
            done,
            createdAt: new Date(task.createdAt),
            ...(done ? { doneAt: new Date(task.updatedAt) } : {}),
            ...(task.deletedAt === null
              ? {}
              : { removedAt: new Date(task.deletedAt) }),
          });
        }
      },
    );
  }

  private async copyInvoices(
    tenantId: string,
    cursor: string | undefined,
  ): Promise<Backfill> {
    const invoices = await this.invoiceHistory.page(
      tenantId,
      cursor,
      ReportsDefaults.backfillPageSize,
    );
    return this.saveCopied(
      BackfillSource.Invoices,
      invoices.nextCursor,
      async () => {
        for (const invoice of invoices.items) {
          await this.finance.applyInvoice({
            invoiceId: invoice.id,
            status: invoice.status,
            progress: InvoiceProgress.rankOf(invoice.status),
            number: invoice.number,
            currency: invoice.currency,
            totalMinor: invoice.total.amountMinor,
            issuedAt: new Date(invoice.issuedAt),
            ...(invoice.paidAt === null
              ? {}
              : { paidAt: new Date(invoice.paidAt) }),
          });
        }
      },
    );
  }

  /** Projects a page and saves how far it got, in one transaction. */
  private async saveCopied(
    source: BackfillSource,
    nextCursor: string | null,
    project: () => Promise<void>,
  ): Promise<Backfill> {
    const reached: Backfill =
      nextCursor === null
        ? { completed: true }
        : { cursor: nextCursor, completed: false };
    await this.transactions.runInTransaction(async () => {
      await project();
      await this.progress.save(source, reached);
    });
    return reached;
  }
}

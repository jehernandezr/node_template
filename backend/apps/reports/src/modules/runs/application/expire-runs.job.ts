import { Injectable } from '@nestjs/common';
import {
  Clock,
  JobScheduleKind,
  ScheduledJob,
  type JobSchedule,
} from '@platform/kernel';
import { LoggerPort } from '@platform/observability';
import { ReportsJob } from '../../../shared/enums/reports-job.enum.js';
import { TenantShard } from '../../../shared/utils/tenant-shard.js';
import { ReportResultStore } from '../domain/report-result-store.js';
import { ReportRunMaintenance } from '../domain/report-run-maintenance.js';

/**
 * Marks as expired the runs whose result passed `REPORTS_RESULT_TTL_DAYS` and deletes that result. It runs at a fixed
 * minute of every hour in UTC, not periodically from startup: with frequent deployments a one-day interval would never
 * elapse. Repeating it changes nothing already expired. One that could not be deleted is no longer delivered (the run is
 * expired); the failure is logged.
 */
@Injectable()
export class ExpireRunsJob extends ScheduledJob {
  readonly name = ReportsJob.ExpireRuns;
  readonly schedule: JobSchedule = {
    kind: JobScheduleKind.Cron,
    expression: '20 * * * *',
  };
  override readonly exclusive = true;

  constructor(
    private readonly maintenance: ReportRunMaintenance,
    private readonly results: ReportResultStore,
    private readonly shard: TenantShard,
    private readonly clock: Clock,
    private readonly logger: LoggerPort,
  ) {
    super();
  }

  async run(): Promise<void> {
    for (const { tenantId, runId } of await this.maintenance.expireBefore(
      this.clock.now(),
    )) {
      try {
        await this.shard.run(tenantId, () => this.results.discard(runId));
      } catch (error) {
        this.logger.error('expired report result not discarded', {
          tenantId,
          runId,
          error,
        });
      }
    }
  }
}

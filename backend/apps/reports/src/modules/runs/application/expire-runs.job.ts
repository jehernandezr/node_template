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
 * Marca vencidas las ejecuciones cuyo resultado pasó `REPORTS_RESULT_TTL_DAYS` y borra ese resultado. Corre a una hora
 * fija de cada hora en UTC, no cada tanto desde el arranque: con despliegues seguidos un intervalo de un día no llegaría
 * a cumplirse. Repetirlo no cambia nada de lo ya vencido. Uno que no se pudo borrar ya no se entrega (la ejecución está
 * vencida); se registra el fallo.
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

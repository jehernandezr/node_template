import { Injectable } from '@nestjs/common';
import {
  Clock,
  JobScheduleKind,
  ScheduledJob,
  type JobSchedule,
} from '@platform/kernel';
import { PersistenceError, PersistenceErrorCode } from '@platform/persistence';
import { IdentityJob } from '../../../shared/enums/identity-job.enum.js';
import { LoginAttemptRetention } from '../domain/login-attempt-retention.js';

/**
 * Crea las particiones mensuales de `login_attempts` antes de que se necesiten y borra las de más de 12
 * meses. Corre a diario: las particiones se crean con meses de adelanto, así que un día perdido no importa.
 */
@Injectable()
export class RotateLoginAttemptPartitionsJob extends ScheduledJob {
  readonly name = IdentityJob.RotateLoginAttemptPartitions;
  readonly schedule: JobSchedule = {
    kind: JobScheduleKind.Cron,
    expression: '30 3 * * *',
  };
  override readonly exclusive = true;

  constructor(
    private readonly retention: LoginAttemptRetention,
    private readonly clock: Clock,
  ) {
    super();
  }

  /**
   * @throws PersistenceError `QueryFailed` si algún shard falló, para que la corrida quede como fallida y se
   *   vea en las métricas del job.
   */
  async run(): Promise<void> {
    const report = await this.retention.maintain(this.clock.now());
    if (report.failedShards.length > 0) {
      throw new PersistenceError(
        PersistenceErrorCode.QueryFailed,
        'login_attempts partition maintenance failed in some shards',
        { details: { shards: [...report.failedShards] } },
      );
    }
  }
}

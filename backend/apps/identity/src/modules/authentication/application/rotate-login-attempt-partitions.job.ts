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
 * Creates the monthly partitions of `login_attempts` before they are needed and drops those older than 12
 * months. Runs daily: partitions are created months in advance, so a missed day does not matter.
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
   * @throws PersistenceError `QueryFailed` if any shard failed, so that the run is marked as failed and
   *   shows in the job metrics.
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

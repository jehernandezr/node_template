import { Injectable } from '@nestjs/common';
import {
  Clock,
  JobScheduleKind,
  ScheduledJob,
  type JobSchedule,
} from '@platform/kernel';
import { IdentityJob } from '../../../shared/enums/identity-job.enum.js';
import { PasswordResetRetention } from '../domain/password-reset-retention.js';

/**
 * Deletes expired password recoveries. They are kept for a few days after expiring to allow investigating
 * a recent abuse; an expired token no longer works, so keeping it longer only piles up rows.
 */
@Injectable()
export class PurgePasswordResetsJob extends ScheduledJob {
  static readonly RETENTION_MS = 7 * 24 * 60 * 60_000;
  private static readonly EVERY_MS = 24 * 60 * 60_000;

  readonly name = IdentityJob.PurgePasswordResets;
  readonly schedule: JobSchedule = {
    kind: JobScheduleKind.Interval,
    everyMs: PurgePasswordResetsJob.EVERY_MS,
  };
  override readonly exclusive = true;

  constructor(
    private readonly retention: PasswordResetRetention,
    private readonly clock: Clock,
  ) {
    super();
  }

  async run(): Promise<void> {
    await this.retention.purgeExpiredBefore(
      new Date(
        this.clock.now().getTime() - PurgePasswordResetsJob.RETENTION_MS,
      ),
    );
  }
}

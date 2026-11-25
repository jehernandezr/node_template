import { Injectable } from '@nestjs/common';
import { AppConfig } from '@platform/config';
import {
  Clock,
  JobScheduleKind,
  ScheduledJob,
  type JobSchedule,
} from '@platform/kernel';
import type { NotificationsConfig } from '../../../config/notifications.config.js';
import { NotificationsJob } from '../../../shared/enums/notifications-job.enum.js';
import { InboxMaintenance } from '../domain/inbox-maintenance.js';

/** Deletes notifications read more than `NOTIFICATIONS_INBOX_RETENTION_DAYS` ago. */
@Injectable()
export class PurgeReadNotificationsJob extends ScheduledJob {
  private static readonly DAY_MS = 24 * 60 * 60_000;

  readonly name = NotificationsJob.PurgeRead;
  readonly schedule: JobSchedule = {
    kind: JobScheduleKind.Interval,
    everyMs: PurgeReadNotificationsJob.DAY_MS,
  };
  override readonly exclusive = true;
  private readonly retentionMs: number;

  constructor(
    private readonly maintenance: InboxMaintenance,
    private readonly clock: Clock,
    config: AppConfig,
  ) {
    super();
    this.retentionMs =
      config.root<NotificationsConfig>().NOTIFICATIONS_INBOX_RETENTION_DAYS *
      PurgeReadNotificationsJob.DAY_MS;
  }

  async run(): Promise<void> {
    await this.maintenance.purgeReadBefore(
      new Date(this.clock.now().getTime() - this.retentionMs),
    );
  }
}

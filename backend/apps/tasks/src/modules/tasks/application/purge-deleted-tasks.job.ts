import { Injectable } from '@nestjs/common';
import { AppConfig } from '@platform/config';
import {
  Clock,
  JobScheduleKind,
  ScheduledJob,
  type JobSchedule,
} from '@platform/kernel';
import type { TasksConfig } from '../../../config/tasks.config.js';
import { TasksJob } from '../../../shared/enums/tasks-job.enum.js';
import { TaskMaintenance } from '../domain/task-maintenance.js';

/** Permanently removes the tasks deleted more than `TASKS_DELETED_RETENTION_DAYS` ago. */
@Injectable()
export class PurgeDeletedTasksJob extends ScheduledJob {
  private static readonly DAY_MS = 24 * 60 * 60_000;

  readonly name = TasksJob.PurgeDeleted;
  readonly schedule: JobSchedule = {
    kind: JobScheduleKind.Interval,
    everyMs: PurgeDeletedTasksJob.DAY_MS,
  };
  override readonly exclusive = true;
  private readonly retentionMs: number;

  constructor(
    private readonly maintenance: TaskMaintenance,
    private readonly clock: Clock,
    config: AppConfig,
  ) {
    super();
    this.retentionMs =
      config.root<TasksConfig>().TASKS_DELETED_RETENTION_DAYS *
      PurgeDeletedTasksJob.DAY_MS;
  }

  async run(): Promise<void> {
    await this.maintenance.purgeDeletedBefore(
      new Date(this.clock.now().getTime() - this.retentionMs),
    );
  }
}

import {
  JobScheduleKind,
  type Clock,
  type RandomSource,
  type ScheduledJob,
} from '@platform/kernel';
import { CronExpression } from './cron/cron-expression.js';
import { InvalidJobScheduleError } from './errors/invalid-job-schedule.error.js';

/** Decides how long until the next run of a job according to its schedule. */
export class JobSchedulePlanner {
  constructor(
    private readonly clock: Clock,
    private readonly random: RandomSource,
  ) {}

  /**
   * An invalid deadline would make every run fail; it is rejected when the job is registered.
   * @throws InvalidJobScheduleError or InvalidCronExpressionError when the schedule or the `timeoutMs` is not valid.
   */
  validate(job: ScheduledJob): void {
    if (!Number.isFinite(job.timeoutMs) || job.timeoutMs <= 0) {
      throw new InvalidJobScheduleError(
        job.name,
        'timeoutMs must be a positive finite number',
      );
    }
    const { schedule } = job;
    if (schedule.kind === JobScheduleKind.Cron) {
      CronExpression.parse(schedule.expression);
      return;
    }
    if (!Number.isInteger(schedule.everyMs) || schedule.everyMs <= 0) {
      throw new InvalidJobScheduleError(
        job.name,
        'everyMs must be a positive integer',
      );
    }
    const jitter = schedule.jitterRatio ?? 0;
    if (!(jitter >= 0 && jitter <= 1)) {
      throw new InvalidJobScheduleError(
        job.name,
        'jitterRatio must be between 0 and 1',
      );
    }
  }

  /** Milliseconds until the next run, never negative. */
  delayMs(job: ScheduledJob): number {
    const { schedule } = job;
    if (schedule.kind === JobScheduleKind.Cron) {
      const now = this.clock.now();
      const next = CronExpression.parse(schedule.expression).nextAfter(now);
      return Math.max(0, next.getTime() - now.getTime());
    }
    const spread = schedule.everyMs * (schedule.jitterRatio ?? 0);
    const offset = spread * (2 * this.random.next() - 1);
    return Math.max(0, Math.round(schedule.everyMs + offset));
  }
}

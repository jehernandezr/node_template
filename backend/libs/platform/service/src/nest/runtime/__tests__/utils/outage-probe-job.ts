import { Injectable } from '@nestjs/common';
import {
  JobScheduleKind,
  ScheduledJob,
  type JobSchedule,
} from '@platform/kernel';
import { OutageProbeJobName } from './outage-probe-job-name.enum.js';

/** An exclusive job that counts its runs, so a test sees whether the lock let it run. */
@Injectable()
export class OutageProbeJob extends ScheduledJob {
  readonly name = OutageProbeJobName.Exclusive;
  readonly schedule: JobSchedule = {
    kind: JobScheduleKind.Interval,
    everyMs: 60_000,
  };
  override readonly exclusive = true;
  runs = 0;

  override async run(): Promise<void> {
    this.runs += 1;
  }
}

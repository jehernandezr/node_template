import { JobScheduleKind } from '../job-schedule.js';
import type { JobSchedule } from '../job-schedule.js';
import { ScheduledJob } from '../scheduled-job.js';

class SampleJob extends ScheduledJob {
  readonly name = 'sample';
  readonly schedule: JobSchedule = {
    kind: JobScheduleKind.Interval,
    everyMs: 1000,
  };
  runs = 0;

  override run(): Promise<void> {
    this.runs += 1;
    return Promise.resolve();
  }
}

describe('ScheduledJob', () => {
  it('is not exclusive and has a default timeout', async () => {
    const job = new SampleJob();
    expect(job.exclusive).toBe(false);
    expect(job.timeoutMs).toBe(60_000);
    await job.run();
    expect(job.runs).toBe(1);
  });

  it('lets a subclass narrow the defaults', () => {
    class ExclusiveJob extends SampleJob {
      override readonly exclusive = true;
      override readonly timeoutMs = 5;
    }
    const job = new ExclusiveJob();
    expect([job.exclusive, job.timeoutMs]).toEqual([true, 5]);
  });
});

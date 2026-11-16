import { JobScheduleKind } from '@platform/kernel';
import { FixedClock } from '@platform/kernel/test-utils';
import { InternalApiJob } from '../internal-api-job.enum.js';
import { ProcessedOperationRetentionJob } from '../processed-operation-retention-job.js';
import { RecordingPurgeableStore } from './utils/recording-purgeable-store.js';

const DAY_MS = 24 * 60 * 60 * 1000;

describe('ProcessedOperationRetentionJob', () => {
  it('run, default retention, purges before now minus seven days', async () => {
    const clock = new FixedClock(new Date('2026-01-10T00:00:00.000Z'));
    const store = new RecordingPurgeableStore();
    const job = new ProcessedOperationRetentionJob(store, clock);

    await job.run();

    expect(store.purgedBefore).toEqual([new Date('2026-01-03T00:00:00.000Z')]);
    expect(ProcessedOperationRetentionJob.DEFAULT_RETENTION_MS).toBe(
      7 * DAY_MS,
    );
  });

  it('run, configured retention, purges before now minus that retention', async () => {
    const clock = new FixedClock(new Date('2026-01-10T00:00:00.000Z'));
    const store = new RecordingPurgeableStore();
    const job = new ProcessedOperationRetentionJob(store, clock, 2 * DAY_MS);

    await job.run();

    expect(store.purgedBefore).toEqual([new Date('2026-01-08T00:00:00.000Z')]);
  });

  it('name, job, is the processed operation retention job', () => {
    const job = new ProcessedOperationRetentionJob(
      new RecordingPurgeableStore(),
      new FixedClock(),
    );

    expect(job.name).toBe(InternalApiJob.ProcessedOperationRetention);
  });

  it('exclusive, job, runs on one process of the cluster at a time', () => {
    const job = new ProcessedOperationRetentionJob(
      new RecordingPurgeableStore(),
      new FixedClock(),
    );

    expect(job.exclusive).toBe(true);
  });

  it('schedule, job, runs every hour with a tenth of jitter', () => {
    const job = new ProcessedOperationRetentionJob(
      new RecordingPurgeableStore(),
      new FixedClock(),
    );

    expect(job.schedule).toEqual({
      kind: JobScheduleKind.Interval,
      everyMs: 3_600_000,
      jitterRatio: 0.1,
    });
  });
});

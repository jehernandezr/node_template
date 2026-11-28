import { FixedClock, FixedRandomSource } from '@platform/kernel/test-utils';
import { DeadlineExceededError } from '@platform/primitives';
import { SchedulingErrorCode } from '../errors/scheduling-error-code.enum.js';
import { JobExecution, type JobExecutionSignals } from '../job-execution.js';
import {
  JobRunResult,
  SchedulingMetric,
  SchedulingMetricAttribute,
} from '../scheduling-metric.enum.js';
import {
  Eventually,
  FakeLogLevel,
  FakeLogger,
  InMemoryTestLock,
  RecordingJob,
  RecordingJobBehavior,
  RecordingMetrics,
} from './utils/index.js';

const START = new Date('2026-11-14T10:00:00.000Z');
const HEX = /^[0-9a-f]+$/;

describe('JobExecution', () => {
  let clock: FixedClock;
  let lock: InMemoryTestLock;
  let logger: FakeLogger;
  let metrics: RecordingMetrics;
  let shutdown: AbortController;
  let abandon: AbortController;
  let signals: JobExecutionSignals;
  let execution: JobExecution;

  beforeEach(() => {
    clock = new FixedClock(START);
    lock = new InMemoryTestLock();
    logger = new FakeLogger();
    metrics = new RecordingMetrics();
    shutdown = new AbortController();
    abandon = new AbortController();
    signals = { shutdown: shutdown.signal, abandon: abandon.signal };
    execution = new JobExecution(
      clock,
      new FixedRandomSource([0.5], 1),
      lock,
      logger,
      metrics,
    );
  });

  describe('when a job succeeds', () => {
    it('reports Succeeded and counts the run', async () => {
      const job = new RecordingJob({ name: 'job-a' });
      await expect(execution.execute(job, signals)).resolves.toBe(
        JobRunResult.Succeeded,
      );
      expect(
        metrics.total(SchedulingMetric.Runs, {
          [SchedulingMetricAttribute.Job]: 'job-a',
          [SchedulingMetricAttribute.Result]: JobRunResult.Succeeded,
        }),
      ).toBe(1);
      expect(metrics.records.map((record) => record.name)).toContain(
        SchedulingMetric.RunDuration,
      );
    });

    it('gives the job a hexadecimal run id and the clock start time', async () => {
      const job = new RecordingJob({ name: 'job-a' });
      await execution.execute(job, signals);
      const [context] = job.contexts;
      expect(context.runId).toMatch(HEX);
      expect(context.startedAt).toEqual(START);
    });
  });

  describe('when a job fails', () => {
    it('rethrows the job error and counts the failure', async () => {
      const job = new RecordingJob({
        name: 'job-a',
        behavior: RecordingJobBehavior.Fail,
      });
      await expect(execution.execute(job, signals)).rejects.toThrow(
        'job failed',
      );
      expect(
        metrics.total(SchedulingMetric.Runs, {
          [SchedulingMetricAttribute.Result]: JobRunResult.Failed,
        }),
      ).toBe(1);
      expect(logger.levels()).toContain(FakeLogLevel.Error);
    });
  });

  describe('when the job is exclusive', () => {
    it('skips the run when another process holds the lock', async () => {
      lock.held = true;
      const job = new RecordingJob({ name: 'job-a', exclusive: true });
      await expect(execution.execute(job, signals)).resolves.toBe(
        JobRunResult.Skipped,
      );
      expect(job.runs).toBe(0);
      expect(lock.releases).toBe(0);
      expect(lock.held).toBe(true);
    });

    it('skips the run and warns when the lock store cannot be reached', async () => {
      lock.failAcquire = true;
      const job = new RecordingJob({ name: 'job-a', exclusive: true });
      await expect(execution.execute(job, signals)).resolves.toBe(
        JobRunResult.Skipped,
      );
      expect(job.runs).toBe(0);
      expect(lock.releases).toBe(0);
      expect(logger.levels()).toContain(FakeLogLevel.Warn);
      expect(
        metrics.total(SchedulingMetric.Runs, {
          [SchedulingMetricAttribute.Job]: 'job-a',
          [SchedulingMetricAttribute.Result]: JobRunResult.Skipped,
        }),
      ).toBe(1);
    });

    it('releases the lock after a successful run', async () => {
      const job = new RecordingJob({ name: 'job-a', exclusive: true });
      await execution.execute(job, signals);
      expect(lock.held).toBe(false);
      expect(lock.releases).toBe(1);
    });

    it('releases the lock after a failed run', async () => {
      const job = new RecordingJob({
        name: 'job-a',
        exclusive: true,
        behavior: RecordingJobBehavior.Fail,
      });
      await expect(execution.execute(job, signals)).rejects.toThrow(
        'job failed',
      );
      expect(lock.held).toBe(false);
      expect(lock.releases).toBe(1);
    });

    it('reports Succeeded and warns when the release fails', async () => {
      lock.failRelease = true;
      const job = new RecordingJob({ name: 'job-a', exclusive: true });
      await expect(execution.execute(job, signals)).resolves.toBe(
        JobRunResult.Succeeded,
      );
      expect(logger.levels()).toContain(FakeLogLevel.Warn);
    });
  });

  describe('when the job is not exclusive', () => {
    it('does not touch the lock', async () => {
      const job = new RecordingJob({ name: 'job-a' });
      await execution.execute(job, signals);
      expect(lock.releases).toBe(0);
    });
  });

  describe('when the job exceeds its timeout', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('rejects with a deadline error and aborts the job signal', async () => {
      const job = new RecordingJob({
        name: 'job-a',
        timeoutMs: 5,
        behavior: RecordingJobBehavior.HangUntilAborted,
      });
      const outcome = expect(
        execution.execute(job, signals),
      ).rejects.toBeInstanceOf(DeadlineExceededError);
      await jest.advanceTimersByTimeAsync(5);
      await outcome;
      expect(job.contexts[0].signal.aborted).toBe(true);
    });
  });

  describe('when an exclusive run outlives part of its lease', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('renews the lease while the job runs', async () => {
      const job = new RecordingJob({
        name: 'job-a',
        exclusive: true,
        timeoutMs: 300,
        behavior: RecordingJobBehavior.WaitForRelease,
      });
      const run = execution.execute(job, signals);
      await jest.advanceTimersByTimeAsync(250);
      expect(lock.renewals).toBe(2);
      job.release();
      await expect(run).resolves.toBe(JobRunResult.Succeeded);
      await jest.advanceTimersByTimeAsync(1_000);
      expect(lock.renewals).toBe(2);
    });

    it('aborts the run and logs it when the lease is lost', async () => {
      lock.leaseLost = true;
      const job = new RecordingJob({
        name: 'job-a',
        exclusive: true,
        timeoutMs: 300,
        behavior: RecordingJobBehavior.HangUntilAborted,
      });
      const outcome = expect(
        execution.execute(job, signals),
      ).rejects.toMatchObject({ code: SchedulingErrorCode.LeaseLost });
      await jest.advanceTimersByTimeAsync(100);
      await outcome;
      expect(job.abortedRuns).toBe(1);
      expect(logger.entries).toContainEqual(
        expect.objectContaining({
          level: FakeLogLevel.Error,
          fields: expect.objectContaining({ job: 'job-a' }),
        }),
      );
    });
  });

  describe('when the runner shuts down during a run', () => {
    it('rejects with the shutdown reason and aborts the job', async () => {
      const job = new RecordingJob({
        name: 'job-a',
        behavior: RecordingJobBehavior.HangUntilAborted,
      });
      const outcome = expect(execution.execute(job, signals)).rejects.toThrow(
        'shut down',
      );
      await Eventually.until(() => job.runs === 1);
      shutdown.abort(new Error('shut down'));
      await outcome;
      expect(job.abortedRuns).toBe(1);
    });
  });

  describe('when the runner abandons a job that ignored the abort', () => {
    it('settles, keeps the lease for its expiry and logs the abandoned job', async () => {
      const job = new RecordingJob({
        name: 'job-a',
        exclusive: true,
        behavior: RecordingJobBehavior.WaitForRelease,
      });
      const outcome = expect(execution.execute(job, signals)).rejects.toThrow(
        'shut down',
      );
      await Eventually.until(() => job.runs === 1);
      shutdown.abort(new Error('shut down'));
      abandon.abort();
      await outcome;
      expect(lock.releases).toBe(0);
      expect(lock.held).toBe(true);
      expect(logger.entries).toContainEqual(
        expect.objectContaining({
          level: FakeLogLevel.Warn,
          fields: expect.objectContaining({ job: 'job-a' }),
        }),
      );
      job.release();
    });
  });
});
